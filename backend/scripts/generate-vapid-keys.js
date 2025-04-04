import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

// Create or update .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

// Read existing .env file if it exists
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add or update VAPID keys
const vapidLines = [
  `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`,
  `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`,
  `VAPID_EMAIL=your-email@example.com # Replace with your email`
];

// Check if each VAPID key already exists in the .env file
vapidLines.forEach(line => {
  const key = line.split('=')[0];
  const regex = new RegExp(`^${key}=.*$`, 'm');
  
  if (envContent.match(regex)) {
    // Replace existing line
    envContent = envContent.replace(regex, line);
  } else {
    // Add new line
    envContent += envContent.endsWith('\n') ? line : '\n' + line;
    envContent += '\n';
  }
});

// Write back to .env file
fs.writeFileSync(envPath, envContent);

console.log('VAPID keys have been generated and added to .env file');
console.log('Please update VAPID_EMAIL in .env with your email address');
console.log('\nVAPID Public Key:', vapidKeys.publicKey);
console.log('VAPID Private Key:', vapidKeys.privateKey);