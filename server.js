const express = require('express');
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// --- Database Setup ---
const dbPath = path.resolve(__dirname, 'hitomi_logs.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            manga_number INTEGER NOT NULL,
            language TEXT,
            tags TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// --- Puppeteer Setup ---
let browser;
(async () => {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
})();

app.use(express.static(__dirname));

// --- API Endpoints ---

app.get('/open', async (req, res) => {
    const mangaNumber = req.query.number;
    if (!mangaNumber || !/^[0-9]+$/.test(mangaNumber)) {
        return res.status(400).json({ success: false, message: '유효한 숫자를 입력해주세요.' });
    }

    const url = `https://hitomi.la/galleries/${mangaNumber}.html`;
    let page;

    try {
        if (!browser || !browser.isConnected()) {
            console.log('Browser disconnected. Relaunching...');
            browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        }
        page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const data = await page.evaluate(() => {
            if (document.body.innerHTML.includes('404 - Not Found')) return null;
            const languageElement = document.querySelector('#language');
            const language = languageElement ? languageElement.innerText.trim() : 'N/A';
            const tags = Array.from(document.querySelectorAll('.gallery-info .tags a')).map(a => a.innerText.trim());
            return { language, tags };
        });

        if (!data) {
            return res.json({ success: false, message: '해당 품번을 찾을 수 없습니다. 404 Not Found.' });
        }

        const insertQuery = `INSERT INTO logs (manga_number, language, tags) VALUES (?, ?, ?)`;
        db.run(insertQuery, [mangaNumber, data.language, data.tags.join(',')], (err) => {
            if (err) {
                console.error('Failed to write to database:', err);
                // Non-fatal, so we don't return an error to the user here.
            }
        });

        res.json({ success: true, url });

    } catch (error) {
        console.error('Detailed error:', error);
        res.json({ success: false, message: '데이터를 스크래핑하는 중 오류가 발생했습니다.' });
    } finally {
        if (page) await page.close();
    }
});

app.get('/api/stats', (req, res) => {
    const period = req.query.period || 'all';
    let dateFilter = '';
    switch (period) {
        case 'week': dateFilter = `WHERE timestamp >= date('now', '-7 days')`; break;
        case 'month': dateFilter = `WHERE timestamp >= date('now', '-1 month')`; break;
        case 'half_year': dateFilter = `WHERE timestamp >= date('now', '-6 months')`; break;
        case 'year': dateFilter = `WHERE timestamp >= date('now', '-1 year')`; break;
        case 'all':
        default: break; // No filter
    }

    const topNumbersQuery = `SELECT manga_number, COUNT(manga_number) as count FROM logs ${dateFilter} GROUP BY manga_number ORDER BY count DESC LIMIT 10`;
    const allTagsQuery = `SELECT tags FROM logs ${dateFilter}`;

    db.all(topNumbersQuery, [], (err, numbers) => {
        if (err) {
            console.error('Error querying top numbers:', err);
            return res.status(500).json({ error: '데이터베이스 조회 중 오류 발생' });
        }

        db.all(allTagsQuery, [], (err, tagRows) => {
            if (err) {
                console.error('Error querying tags:', err);
                return res.status(500).json({ error: '데이터베이스 조회 중 오류 발생' });
            }

            const tagCounts = {};
            tagRows.forEach(row => {
                if (row.tags) {
                    row.tags.split(',').forEach(tag => {
                        if (tag) { // Ensure not an empty string
                           tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        }
                    });
                }
            });

            const sortedTags = Object.entries(tagCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([name, count]) => ({ name, count }));

            res.json({ topNumbers: numbers, topTags: sortedTags });
        });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log('Closing database and browser...');
    if (db) db.close();
    if (browser) await browser.close();
    process.exit(0);
});
