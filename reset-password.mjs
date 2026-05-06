import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'master.db');

async function resetPassword() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npm run reset-password <username> <new_password>');
    console.log('Example: npm run reset-password mann mynewpassword');
    process.exit(1);
  }

  const [username, newPassword] = args;
  const lowerUsername = username.toLowerCase();

  try {
    const db = new Database(dbPath);
    
    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(lowerUsername);
    
    if (!user) {
      console.error(`❌ Error: User '${username}' not found.`);
      process.exit(1);
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET passwordHash = ? WHERE username = ?').run(passwordHash, lowerUsername);
    
    console.log(`✅ Success! Password for '${username}' has been successfully reset.`);
    console.log(`You can now log in at http://localhost:3000/login with the new password.`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

resetPassword();
