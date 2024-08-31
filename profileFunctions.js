import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Construct the directory name based on the current module's URL
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = path.join(__dirname, 'userProfiles.json');

export function loadProfiles() {
    try {
        return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));
    } catch (error) {
        console.error('Failed to load profiles:', error);
        return {};
    }
}

export function getProfile(userId) {
    const profiles = loadProfiles();
    return profiles[userId] || null;
}