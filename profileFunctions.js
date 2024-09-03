import pkg from 'pg';
const { Client } = pkg;

// Connect to postgres
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to connect to the database
export async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Database connection successful');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1); // Exit the process with errors if the database connection fails
    }
}

// Get profile by Discord ID
export async function getProfile(discordId) {
    try {
        const res = await client.query('SELECT * FROM riot_profiles WHERE discord_id = $1', [discordId]);
        return res.rows[0] || null;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Set Profile
export async function setProfile(discordId, username, tagline, region) {
    try {
        const query = `
            INSERT INTO riot_profiles (discord_id, riot_username, tagline, region)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (discord_id)
            DO UPDATE SET riot_username = EXCLUDED.riot_username, tagline = EXCLUDED.tagline, region = EXCLUDED.region;
        `;
        await client.query(query, [discordId, username, tagline, region]);
    } catch (error) {
        console.error('Error setting profile:', error);
    }
}

// Function to disconnect from the database
export function closeConnection() {
    client.end();
}

connectToDatabase();