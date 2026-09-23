const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// הגנה מושלמת מפני קריסות - הבוט לא ייכבה לעולם!
process.on('unhandledRejection', (reason, promise) => {
    console.error('נלכדה שגיאה לא מטופלת:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('נלכדה שגיאה חמורה:', err);
});

client.once('ready', () => {
    console.log(`הבוט ${client.user.tag} מחובר ומוכן לעבודה!`);
});

// תגובה להודעות בצ'אט
client.on('messageCreate', async (message) => {
    try {
        // מונע מהבוט לענות לעצמו או לבוטים אחרים
        if (message.author.bot) return;

        // אפשרות 1: אם מישהו כותב בדיוק "היי"
        if (message.content === 'היי') {
            await message.reply('היי');
        }
        
        // אפשרות 2: אם מישהו כותב בדיוק "מה נשמע טרופידון?"
        if (message.content === 'מה נשמע טרופידון?') {
            await message.reply('בסדר... מה איתך?');
        }
        
    } catch (error) {
        console.error('שגיאה בזמן מענה:', error);
    }
});

// התחברות באמצעות הטוקן הסודי
client.login(process.env.DISCORD_TOKEN);
