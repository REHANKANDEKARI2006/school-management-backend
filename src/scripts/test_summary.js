import fs from "fs";

async function run() {
    try {
        const res = await fetch('http://localhost:5000/api/attendance/summary?sessionId=15');
        const text = await res.text();
        fs.writeFileSync('summary_response.txt', text);
        console.log("Status:", res.status);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

run();
