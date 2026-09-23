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

        // אם מישהו כותב בדיוק "היי", הבוט יענה לו "מודרת"
        if (message.content === 'היי') {
            await message.reply('מודרת');
        }
    } catch (error) {
        console.error('שגיאה בזמן מענה:', error);
    }
});

// התחברות באמצעות הטוקן הסודי (שנגדיר עוד מעט ב-Render)
client.login(process.env.DISCORD_TOKEN);
