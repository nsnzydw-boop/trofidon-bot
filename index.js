const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר המשחקים הפעילים של איש תלוי
const activeGames = new Map();

// =======================================================
// 👑 נעילת הבוט: שים כאן את ה-ID האישי שלך מדיסקורד! 👑
// =======================================================
const OWNER_ID = 'שים_כאן_את_האיידי_האישי_שלך';

// הגנה מוחלטת מפני קריסות
process.on('unhandledRejection', (reason) => { console.error('שגיאה:', reason); });
process.on('uncaughtException', (err) => { console.error('שגיאה חמורה:', err); });

// שרת אינטרנט פנימי לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Trofidon is Alive!\n');
});
server.listen(process.env.PORT || 10000);

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

// קישורי התמונות של התיבות
const images = {
    regular: {
        closed: 'https://discordapp.com',
        opened: 'https://discordapp.com'
    },
    wood: {
        closed: 'https://discordapp.com',
        opened: 'https://discordapp.com'
    },
    gold: {
        closed: 'https://discordapp.com',
        opened: 'https://discordapp.com'
    }
};

// רישום פקודות סלאש אוטומטית בדיסקורד
client.once('ready', async () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
    
    const commandsData = [
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('גורם לבוט לשלוח הודעה מותאמת אישית שלכם בצ׳אט')
            .addStringOption(option => option.setName('תוכן').setDescription('רשמו את מה שאתם רוצים שהבוט יגיד').setRequired(true)),
            
        new SlashCommandBuilder()
            .setName('פתח-תיבה')
            .setDescription('זמינות של תיבת פנדורה לפתיחה בשרת לכולם!')
            .addStringOption(option => 
                option.setName('סוג').setDescription('בחרו את סוג התיבה').setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
            ),

        new SlashCommandBuilder()
            .setName('הוסף-תיבה-למשתמש')
            .setDescription('הענקת תיבת פנדורה אישית למשתמש ספציפי בשרת!')
            .addStringOption(option => 
                option.setName('סוג').setDescription('בחרו את סוג התיבה').setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
            )
            .addUserOption(option => 
                option.setName('משתמש').setDescription('בחרו או תייגו את המשתמש שיקבל את התיבה').setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('תמונות-תיבה')
            .setDescription('שינוי תמונות התיבות בבוט בלייב!')
            .addStringOption(option => option.setName('תיבה').setDescription('בחרו איזה סוג תיבה לשנות').setRequired(true)
                .addChoices(
                    { name: '🟢 תיבה רגילה ירוקה', value: 'regular' },
                    { name: '📦 תיבת עץ', value: 'wood' },
                    { name: '🟡 תיבת זהב', value: 'gold' }
                )
            )
            .addStringOption(option => option.setName('מצב').setDescription('בחרו האם לשנות את המצב הסגור או הפתוח').setRequired(true)
                .addChoices(
                    { name: '🔒 תיבה סגורה (לפני פתיחה)', value: 'closed' },
                    { name: '🔓 תיבה פתוחה (אחרי פתיחה)', value: 'opened' }
                )
            )
            .addAttachmentOption(option => option.setName('קובץ-תמונה').setDescription('העלו את קובץ התמונה החדש מהמחשב').setRequired(true)),

        new SlashCommandBuilder()
            .setName('איש-תלוי-הפעלות')
            .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
            .addStringOption(option => option.setName('נושא').setDescription('רשמו את נושא המשחק').setRequired(true))
            .addStringOption(option => option.setName('מילה').setDescription('רשמו את המילה הסודית שצריך לנחש').setRequired(true))
            .addAttachmentOption(option => option.setName('תמונה').setDescription('קובץ תמונה מהמחשב (אופציונלי)').setRequired(false))
    ];

    try {
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await client.application.commands.set(commandsData, guildId);
        }
        console.log('כל פקודות הסלאש עודכנו בשרת שלך בהצלחה!');
    } catch (error) { console.error('שגיאה ברישום:', error); }
});

// הקשבה להודעות בצ'אט (תגובות רגילות וניחושי איש תלוי)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === 'היי') return await message.reply('היי');
    if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

    if (activeGames.has(message.channel.id)) {
        const gameState = activeGames.get(message.channel.id);
        const guess = message.content.trim();
        if (guess.length !== 1) return;
        if (gameState.guessedLetters.has(guess)) return await message.reply(`האות **${guess}** כבר נוחשה!`);

        gameState.guessedLetters.add(guess);
        let statusText = '';
        if (gameState.word.includes(guess)) {
            const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
            if (isWon) { activeGames.delete(message.channel.id); const winEmbed = new EmbedBuilder().setColor('#1f8b4c').setTitle('🎉 ניצחון!').setDescription(`המילה הייתה: **${gameState.word}**`).setImage(gameState.image); return await message.reply({ embeds: [winEmbed] }); }
            statusText = `✅ האות **${guess}** נכונה!`;
        } else { statusText = `❌ האות **${guess}** אינה נכונה!`; }

        const updatedEmbed = new EmbedBuilder().setColor('#0099ff').setTitle('🎯 איש תלוי').setDescription(`• **הנושא:** ${gameState.subject}\n\n${statusText}\n\n**המילה:**\n${displayWordStatus(gameState)}`).setImage(gameState.image);
        return await message.reply({ embeds: [updatedEmbed] });
    }
});

// הקשבה לפקודות סלאש ואינטראקציות
client.on('interactionCreate', async (interaction) => {
    try {
        // לחיצה על כפתור פתיחת התיבה (עובד גם עבור פתיחה כללית וגם עבור תיבה אישית)
        if (interaction.isButton() && interaction.customId.startsWith('open_box_')) {
            const parts = interaction.customId.split('_');
            const boxType = parts[2];
            const allowedUserId = parts[3]; // ה-ID של המשתמש שמותר לו לפתוח (אם קיים)

            // 🔒 אבטחת תיבה אישית: אם התיבה שייכת למישהו ספציפי, בודק שזה באמת הוא לוחץ
            if (allowedUserId && interaction.user.id !== allowedUserId) {
                return await interaction.reply({ content: '❌ התיבה הזו הוענקה למשתמש אחר בלבד! אין באפשרותך לפתוח אותה.', ephemeral: true });
            }

            let prizeList, boxName, embedColor, openedImage;
            if (boxType === 'regular') { prizeList = regularPrizes; boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; openedImage = images.regular.opened; }
            else if (boxType === 'wood') { prizeList = woodPrizes; boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; openedImage = images.wood.opened; }
            else if (boxType === 'gold') { prizeList = goldPrizes; boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; openedImage = images.gold.opened; }

            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];
            const finalEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎉 התיבה נפתחה בהצלחה!')
                .setDescription(`👑 ונפתחה **${boxName}** על ידי המשתמש ${interaction.user}!\n\n✨ **והפרס שזכיתם בו הוא:** ✨\n> **${randomPrize}**`)
                .setImage(openedImage);

            return await interaction.update({ embeds: [finalEmbed], components: [] });
        }

        // 🔒 בדיקת אבטחה לפקודות סלאש: רק אתה (בעל הבוט) יכול ליצור ולהפעיל פקודות!
        if (interaction.isChatInputCommand()) {
            if (interaction.user.id !== OWNER_ID) {
                return await interaction.reply({ content: '❌ אין לך הרשאות להשתמש בבוט זה. הפקודות מיועדות לבעלי הבוט בלבד!', ephemeral: true });
            }

            // 1. פקודת SAY
            if (interaction.commandName === 'say') {
                const messageContent = interaction.options.getString('תוכן');
                await interaction.reply({ content: '✅ ההודעה נשלחה בהצלחה!', ephemeral: true });
                return await interaction.channel.send({ content: messageContent });
            }

            // 2. פקודת תמונות-תיבה
            if (interaction.commandName === 'תמונות-תיבה') {
