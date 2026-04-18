import { google } from 'googleapis';
import axios from 'axios';
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

class HolidayServiceClass {
  constructor() {
    this.googleCalendarId = 'en.indian#holiday@group.v.calendar.google.com';
    // Precisely targeted keywords to avoid over-filtering
    this.excludedKeywords = ['Eid', 'Muharram', 'Milad', 'Ramzan', 'Roza', 'Bakri', 'Fitr', 'Id-ul', 'Mesadi'];
  }

  // Get Google Calendar API client
  async getGoogleClient() {
    const keyPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH;
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    return google.calendar({ version: 'v3', auth });
  }

  // Fetch from Google Calendar
  async fetchGoogleHolidays(year) {
    try {
      const calendar = await this.getGoogleClient();
      const timeMin = new Date(`${year}-01-01T00:00:00Z`).toISOString();
      const timeMax = new Date(`${year}-12-31T23:59:59Z`).toISOString();

      const response = await calendar.events.list({
        calendarId: this.googleCalendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = response.data.items || [];
      console.log(`[HolidayService] Raw Google Items for ${year}:`, items.length);
      
      return items.map(event => ({
        name: event.summary,
        date: event.start.date || event.start.dateTime.split('T')[0],
        category: 'National',
        source: 'Google'
      }));
    } catch (error) {
      console.error('fetchGoogleHolidays Error:', error.message);
      return [];
    }
  }

  // Fetch Recurring Annual Holidays from DB and map to specific year
  async fetchRecurringHolidays(year) {
    try {
      const res = await pool.query(
        'SELECT id, holiday_name as name, day, month, state_tag FROM recurring_holidays WHERE is_active = true'
      );
      
      return res.rows.map(h => {
        // Construct ISO date string: YYYY-MM-DD
        const month = String(h.month).padStart(2, '0');
        const day = String(h.day).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        return {
          id: `rec_${h.id}`,
          name: h.name,
          date: dateStr,
          category: h.state_tag, // 'Maharashtra', 'Karnataka', or 'Both'
          source: 'System'
        };
      });
    } catch (error) {
      console.error('fetchRecurringHolidays Error:', error);
      return [];
    }
  }

  // Filter Islamic holidays
  isIslamicHoliday(name) {
    return this.excludedKeywords.some(keyword => 
      name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Deduplicate and Merge with Category Prioritization
  mergeAndDeduplicate(googleHolidays, recurringHolidays, customHolidays) {
    const combined = [...googleHolidays, ...recurringHolidays, ...customHolidays];
    const filtered = combined.filter(h => !this.isIslamicHoliday(h.name));
    
    // Group by Date for deduplication
    const groupedByDate = {};
    filtered.forEach(h => {
        const date = h.date.split('T')[0];
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(h);
    });

    const finalHolidays = [];

    Object.keys(groupedByDate).forEach(date => {
        const items = groupedByDate[date];
        const uniqueInDate = [];

        items.forEach(h => {
            const hName = h.name.toLowerCase();
            const existing = uniqueInDate.find(u => {
                const uName = u.name.toLowerCase();
                // Check for significant overlap: handles "Shivaji Jayanti" vs "Chhatrapati Shivaji Maharaj Jayanti"
                return uName.includes(hName) || hName.includes(uName) ||
                       (uName.split(' ').some(word => word.length > 4 && hName.includes(word)));
            });

            if (existing) {
                // Prioritize State-specific categories to ensure colored dots (Orange/Blue)
                if (h.category === 'Maharashtra' || h.category === 'Karnataka') {
                    existing.category = h.category;
                }
                // If one is Maharashtra and other is Karnataka, tag as National ('Both')
                else if ((existing.category === 'Maharashtra' && h.category === 'Karnataka') || 
                         (existing.category === 'Karnataka' && h.category === 'Maharashtra')) {
                    existing.category = 'National';
                }
                // Default to National if the source is Google and no state tag set yet
                else if (h.source === 'Google' && existing.category === 'National') {
                   existing.source = 'Google';
                }
            } else {
                uniqueInDate.push({ ...h });
            }
        });

        finalHolidays.push(...uniqueInDate);
    });

    return finalHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Get Holidays for the year (with Caching)
  async getHolidays(year) {
    try {
      // 1. Fetch & Cache National Holidays (Google)
      const cacheRes = await pool.query(
        'SELECT * FROM holiday_cache WHERE year = $1 AND source = $2',
        [year, 'Google']
      );

      const sourceCache = cacheRes.rows[0];
      const isFresh = sourceCache && (new Date() - new Date(sourceCache.last_fetched_at) < 30 * 24 * 60 * 60 * 1000);

      let googleHolidays = [];
      if (isFresh) {
        googleHolidays = sourceCache.holiday_data;
      } else {
        googleHolidays = await this.fetchGoogleHolidays(year);
        if (googleHolidays.length > 0) {
          await pool.query(
            `INSERT INTO holiday_cache (year, holiday_data, source, last_fetched_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (year, source) 
             DO UPDATE SET holiday_data = EXCLUDED.holiday_data, last_fetched_at = now()`,
            [year, JSON.stringify(googleHolidays), 'Google']
          );
        } else if (sourceCache) {
          googleHolidays = sourceCache.holiday_data;
        }
      }

      // 2. Fetch Recurring Holidays
      const recurringHolidays = await this.fetchRecurringHolidays(year);

      // 3. Fetch Custom Holidays (One-off)
      const customRes = await pool.query(
        'SELECT id, holiday_name as name, holiday_date as date, category, \'Admin\' as source FROM custom_holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1',
        [year]
      );
      
      const customHolidays = customRes.rows.map(r => ({
        ...r,
        id: `cus_${r.id}`,
        date: r.date.toISOString().split('T')[0]
      }));

      // 4. Merge and Deduplicate
      return this.mergeAndDeduplicate(googleHolidays, recurringHolidays, customHolidays);

    } catch (error) {
      console.error('getHolidays Error:', error);
      return [];
    }
  }

  // Get Holidays for a specific Month
  async getHolidaysByMonth(year, month) {
    const allHolidays = await this.getHolidays(year);
    return allHolidays.filter(h => {
      const d = new Date(h.date);
      return d.getUTCFullYear() === parseInt(year) && (d.getUTCMonth() + 1) === parseInt(month);
    });
  }
}

export const HolidayService = new HolidayServiceClass();
