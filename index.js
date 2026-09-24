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

// בנק התיבות המאובטח של המשתמשים
const userInventory = new Map();

// =======================================================
// 👑 נעילת הבוט: שים כאן את ה-ID האישי שלך מדיסקורד! 👑
// =======================================================
const OWNER_ID = 'שים_כאן_את_האיידי_האישי_שלך';

// הגנה מוחלטת מפני קריסות
process.on('unhandledRejection', (reason) => { console.error('שגיאה:', reason); });
process.on('uncaughtException', (err) => { console.error('שגיאה חמורה:', err); });

// שרת אינטרנט פנימי לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon", timestamp: Date.now() }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`שרת המניעה מאופליין פועל בהצלחה על פורט ${PORT}`);
});

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

// קישורי התמונות המקוריים של התיבות שלך
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
            .setName('נתינת-תיבה')
            .setDescription('הענקת תיבת פנדורה אישית למלאי המאובטח של המשתמש!')
            .addUserOption(option => 
                option.setName('משתמש').setDescription('בחרו או תייגו את המשתמש שיקבל את התיבה').setRequired(true)
            )
            .addStringOption(option => 
                option.setName('סוג').setDescription('בחרו את סוג התיבה להענקה').setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
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

// הקשבה להודעות בצ'אט
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        
        if (message.content === 'היי') return await message.reply('היי');
        if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

        // פקודת !פתחתיבה לפתיחת המלאי האישי
        if (message.content === '!פתחתיבה') {
            const userId = message.author.id;
            const userBoxes = userInventory.get(userId) || [];

            if (userBoxes.length === 0) {
                return await message.reply('אין לך תיבות לפתוח');
            }

            const boxType = userBoxes.shift();
            userInventory.set(userId, userBoxes);

            let boxName, embedColor, closedImage;
            if (boxType === 'regular') { boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; closedImage = images.regular.closed; }
            else if (boxType === 'wood') { boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; closedImage = images.wood.closed; }
            else if (boxType === 'gold') { boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; closedImage = images.gold.closed; }

            const openEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎁 פתיחת תיבת פנדורה מהמלאי האישי!')
                .setDescription(`היי ${message.author},\nשלפת מהבנק האישי שלך **${boxName}** מוזהבת ונעולה!\n\n🔒 **רק אתה** יכול ללחוץ על הכפתור למטה כדי לפתוח אותה ולגלות את הפרס!`)
                .setImage(closedImage)
                .setFooter({ text: `תיבות שנותרו לך במלאי: ${userBoxes.length}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_box_${boxType}_${userId}`)
                    .setLabel(`פתח את התיבה שלי! 🔓`)
                    .setStyle(ButtonStyle.Primary)
            );

            return await message.reply({ embeds: [openEmbed], components: [row] });
        }

        // מנגנון ניחוש איש תלוי בצ'אט
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
    } catch (error) { console.error(error); }
});

// הקשבה לפקודות סלאש ואינטראקציות
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton() && interaction.customId.startsWith('open_box_')) {
            const parts = interaction.customId.split('_');
            const boxType = parts[2];
            const allowedUserId = parts[3];

            if (allowedUserId && interaction.user.id !== allowedUserId) {
