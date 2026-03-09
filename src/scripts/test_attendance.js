import fs from "fs";

async function run() {
    try {
        const recordsRes = await fetch('http://localhost:5000/api/attendance/record', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: 15,
                records: [
                    { student_id: 183, status_id: 1, remarks: "" }
                ]
            })
        });
        const recordsText = await recordsRes.text();
        fs.writeFileSync('response.txt', recordsText);
    } catch (err) {
        fs.writeFileSync('response.txt', "Error: " + err.message);
    }
}

run();
