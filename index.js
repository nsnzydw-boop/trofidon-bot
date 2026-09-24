const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    SlashCommandBuilder,
    PermissionsBitField
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

// הגנה מוחלטת מפני קריסות - מונע מהבוט להיכבות בשגיאות
process.on('unhandledRejection', (reason) => { 
    console.error('נלכדה שגיאה (דלג):', reason); 
});
process.on('uncaughtException', (err) => { 
    console.error('נלכדה שגיאה חמורה (דלג):', err); 
});

// שרת אינטרנט פנימי חסין לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon", timestamp: Date.now() }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`שרת Keep-Alive פעיל בהצלחה על פורט ${PORT}`);
});

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיותר מהנהלת השרת'];

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
        // 1. פקודת SAY
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('גורם לבוט לשלוח הודעה מותאמת אישית שלכם בצ׳אט')
            .addStringOption(option => option.setName('תוכן').setDescription('רשמו את מה שאתם רוצים שהבוט יגיד').setRequired(true)),
            
        // 2. פקודת פתח-תיבה (כללית לכולם)
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

        // 3. פקודת הוסף-תיבה (הענקה אישית למשתמש!)
        new SlashCommandBuilder()
            .setName('הוסף-תיבה')
            .setDescription('הענקת תיבת פנדורה אישית למלאי המאובטח של המשתמש!')
            .addUserOption(option => 
                option.setName('משתמש').setDescription('בחרו את המשתמש שיקבל את התיבה').setRequired(true)
            )
            .addStringOption(option => 
                option.setName('סוג').setDescription('בחרו את סוג התיבה להענקה').setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
            ),

        // 4. פקודת איש תלוי
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
            // דוחף את כל 4 הפקודות ישירות לשרת שלך ללא דיליי
            await client.application.commands.set(commandsData, guildId);
        }
        console.log('כל 4 פקודות הסלאש עודכנו בשרת שלך בהצלחה!');
    } catch (error) { console.error('שגיאה ברישום פקודות:', error); }
});

// הקשבה להודעות בצ'אט (בשביל !פתחתיבה ותגובות רגילות)
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
            userInventory.set(userId, userBoxes); // מעדכן את המלאי שנותר

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
                    .setCustomId(`open_box_${boxType}_${userId}`) // נועל את הכפתור על ה-ID של המשתמש בלבד
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

// הקשבה לפקודות סלאש ואינטראקציות (לחיצות כפתור)
client.on('interactionCreate', async (interaction) => {
    try {
        // לחיצה על כפתור פתיחת התיבה
        if (interaction.isButton() && interaction.customId.startsWith('open_box_')) {
            const parts = interaction.customId.split('_');
            const boxType = parts[2];
            const allowedUserId = parts[3];

            // 🔒 אבטחה מלאה: מוודא שאף אחד אחר לא יכול לגנוב את הלחיצה בתיבות אישיות
            if (allowedUserId && interaction.user.id !== allowedUserId) {
                return await interaction.reply({ content: '❌ התיבה הזו שייכת למשתמש אחר בלבד! אין באפשרותך לפתוח אותה.', ephemeral: true });
            }

            let prizeList, boxName, embedColor, openedImage;
            if (boxType === 'regular') { prizeList = regularPrizes; boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; openedImage = images.regular.opened; }
            else if (boxType === 'wood') { prizeList = woodPrizes; boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; openedImage = images.wood.opened; }
            else if (boxType === 'gold') { prizeList = goldPrizes; boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; openedImage = images.gold.opened; }

            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];
