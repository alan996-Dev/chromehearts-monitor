import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load local .env file if it exists (for local testing)
dotenv.config();

const BASE_URL = 'https://www.chromehearts.com';
const DATA_FILE = './docs/data/products.json';

// Target categories to monitor
const TARGET_PATHS = [
  '/', // Homepage to monitor menu changes
  '/socks',
  '/scents',
  '/boxers-leggings',
  '/intimates',
  '/baccarat'
];

// Realistic browser headers to minimize Cloudflare detection
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load local database
function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load database, starting fresh:', err.message);
  }
  return {
    last_checked: null,
    last_changed: null,
    menu_items: [],
    products: []
  };
}

// Save database
function saveDatabase(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Database successfully updated.');
  } catch (err) {
    console.error('Failed to save database:', err.message);
  }
}

// Send email notification
async function sendEmailNotification(newProducts, newMenuItems) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  const to = process.env.EMAIL_TO;

  if (!host || !user || !pass || !to) {
    console.log('SMTP configuration missing. Skipping email notification.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  let subject = '🔔 Chrome Hearts New Arrivals / Updates Detected!';
  let html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #000; text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">
        Chrome Hearts Monitor
      </h2>
      <p style="color: #555; font-size: 16px;">We detected updates on the Chrome Hearts website at ${new Date().toLocaleString()}.</p>
  `;

  if (newMenuItems.length > 0) {
    html += `
      <div style="margin-top: 25px;">
        <h3 style="color: #333; border-left: 4px solid #888; padding-left: 10px; text-transform: uppercase;">
          New Navigation Categories
        </h3>
        <ul style="list-style-type: square; padding-left: 20px; line-height: 1.6;">
    `;
    for (const item of newMenuItems) {
      html += `<li><strong>${item.name}</strong> - <a href="${item.url}" style="color: #000; text-decoration: underline;">Link</a></li>`;
    }
    html += `
        </ul>
      </div>
    `;
  }

  if (newProducts.length > 0) {
    html += `
      <div style="margin-top: 25px;">
        <h3 style="color: #333; border-left: 4px solid #888; padding-left: 10px; text-transform: uppercase;">
          New Products Added
        </h3>
        <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 15px;">
    `;

    for (const prod of newProducts) {
      html += `
        <div style="display: flex; border: 1px solid #eaeaea; padding: 15px; border-radius: 6px; background-color: #fafafa; align-items: center;">
          <div style="flex: 0 0 100px; margin-right: 15px;">
            <img src="${prod.image}" alt="${prod.name}" style="width: 100%; border-radius: 4px; object-fit: contain; background: #fff; max-height: 120px;" />
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; color: #111; font-size: 16px; text-transform: uppercase;">${prod.name}</h4>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>ID:</strong> ${prod.id}</p>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Category:</strong> ${prod.category || 'N/A'}</p>
            <p style="margin: 0 0 12px 0; color: #000; font-size: 16px; font-weight: bold;">${prod.price || 'N/A'}</p>
            <a href="${prod.url}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
              View on Website
            </a>
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `
      <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #888; font-size: 12px;">
        <p>This alert was sent automatically by your GitHub Actions Monitor.</p>
        <p><a href="https://github.com/${process.env.GITHUB_REPOSITORY || ''}" style="color: #666;">View Repository</a></p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
    console.log('Email alert sent successfully:', info.messageId);
  } catch (err) {
    console.error('Failed to send email alert:', err.message);
  }
}

// Scrape a page
async function scrapePage(path) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  console.log(`Fetching: ${url}`);
  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      validateStatus: () => true // Allow handling non-200 responses
    });

    if (response.status !== 200) {
      console.warn(`Non-200 response (${response.status}) for ${url}`);
      return null;
    }

    return response.data;
  } catch (err) {
    console.error(`Error requesting ${url}:`, err.message);
    return null;
  }
}

// Main logic
async function run() {
  console.log('--- Starting Chrome Hearts Website Check ---');
  const db = loadDatabase();
  let hasChanges = false;
  const newProductsDetected = [];
  const newMenuItemsDetected = [];

  // 1. Scrape Homepage to monitor Menu Changes
  const homepageHtml = await scrapePage('/');
  if (homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const currentMenu = [];

    // Parse navigation links
    $('.b-nav a').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      const href = $(el).attr('href');
      if (text && href && !href.startsWith('javascript') && href !== '#') {
        const absoluteUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        currentMenu.push({ name: text, url: absoluteUrl });
      }
    });

    // Remove duplicates
    const uniqueMenu = [];
    const seenUrls = new Set();
    for (const item of currentMenu) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        uniqueMenu.push(item);
      }
    }

    console.log(`Parsed ${uniqueMenu.length} menu navigation items.`);

    // Compare menu items
    const savedMenuUrls = new Set(db.menu_items.map(item => item.url));
    for (const item of uniqueMenu) {
      if (!savedMenuUrls.has(item.url)) {
        console.log(`[NEW NAVIGATION ITEM]: ${item.name} (${item.url})`);
        newMenuItemsDetected.push(item);
        hasChanges = true;
      }
    }

    // Update menu in DB
    db.menu_items = uniqueMenu;
  } else {
    console.error('Homepage load failed. Skipping menu change check.');
  }

  // 2. Scrape Category Pages to monitor products
  const categoryPaths = TARGET_PATHS.filter(p => p !== '/');
  for (const path of categoryPaths) {
    // Wait random delay to emulate human behaviour
    const delay = Math.floor(Math.random() * 2000) + 1000;
    await sleep(delay);

    const html = await scrapePage(path);
    if (!html) continue;

    const $ = cheerio.load(html);
    const categoryName = path.replace('/', '').toUpperCase();

    // Strategy A: JSON-LD parse
    const jsonLdElements = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        const json = JSON.parse(content);
        if (json && json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
          json.itemListElement.forEach(item => {
            if (item.url) {
              jsonLdElements.push(item.url);
            }
          });
        }
      } catch (err) {
        // Silent error for malformed/unrelated JSON-LD
      }
    });

    // Strategy B: Parsing HTML product grid tiles (extremely robust)
    $('.product').each((_, el) => {
      const pid = $(el).attr('data-pid');
      if (!pid) return;

      // Extract metadata
      const metadata = $(el).find('.product-metadata');
      const name = metadata.attr('data-name') || $(el).find('.tile-image').attr('alt') || $(el).find('.tile-image').attr('title') || 'UNKNOWN PRODUCT';
      const price = metadata.attr('data-price') || 'N/A';
      
      // Resolve link
      let link = $(el).find('.pdp-link-image').attr('href') || $(el).find('a').attr('href');
      if (link && !link.startsWith('http')) {
        link = `${BASE_URL}${link}`;
      }

      // Resolve image
      let img = $(el).find('.tile-image').attr('src') || $(el).find('.tile-image').attr('srcset');
      if (img) {
        // Clean srcset up (takes first url)
        if (img.includes(',')) {
          img = img.split(',')[0].trim().split(' ')[0];
        }
        if (!img.startsWith('http')) {
          img = `${BASE_URL}${img}`;
        }
      } else {
        img = 'https://www.chromehearts.com/on/demandware.static/Sites-ChromeHearts-Site/-/default/dw0eee263d/images/y-all-are-welcome@2x.png';
      }

      const product = {
        id: pid,
        name: name.trim(),
        price: price.trim(),
        url: link ? link.trim() : `${BASE_URL}${path}`,
        image: img.trim(),
        category: categoryName,
        first_seen: new Date().toISOString()
      };

      // Check if product is already in database
      const exists = db.products.some(p => p.id === pid);
      if (!exists) {
        console.log(`[NEW PRODUCT DETECTED] (${categoryName}): ${product.name} (Price: ${product.price})`);
        newProductsDetected.push(product);
        db.products.push(product);
        hasChanges = true;
      }
    });
  }

  // 3. Save updates and trigger alerts
  db.last_checked = new Date().toISOString();

  if (hasChanges) {
    db.last_changed = new Date().toISOString();
    console.log(`Changes detected. New products: ${newProductsDetected.length}, New categories: ${newMenuItemsDetected.length}`);
    saveDatabase(db);

    // Send notifications
    await sendEmailNotification(newProductsDetected, newMenuItemsDetected);
  } else {
    console.log('No new arrivals or menu modifications detected.');
    saveDatabase(db); // Save to record the last_checked timestamp
  }

  console.log('--- Monitoring Run Complete ---');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
