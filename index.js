const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SlashCommandBuilder, 
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    REST,
    Routes
} = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

// הגדרת הבוט והרשאות
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// הגדרת משתנים חיוניים
const TOKEN = process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN_HERE";
const activeGames = new Map();
const DB_FILE = path.join(__dirname, 'inventory_db.json');

// פונקציות טעינה ושמירה חסינות קריסה לתיבות
function loadInventory() {
    try {
        if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf-8'); return {}; }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (error) { console.error('שגיאה בטעינת המלאי:', error); return {}; }
}

function saveInventory(inventory) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(inventory, null, 4), 'utf-8'); } 
    catch (error) { console.error('שגיאה בשמירת המלאי:', error); }
}

// הגנה גלובלית מפני קריסות שרת ב-Render
process.on('unhandledRejection', (reason) => { console.error('נלכדה שגיאה (Rejection):', reason); });
process.on('uncaughtException', (err) => { console.error('נלכדה שגיאה חמורה (Exception):', err); });

// שרת אינטרנט פנימי שחובה בשביל Render שלא יקרוס
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon" }));
});
server.listen(process.env.PORT || 10000);

// פרסים ותמונות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

const images = {
    regular: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    wood: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    gold: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' }
};

// הגדרת מערך הפקודות בצורה נקייה לחלוטין
const commandsData = [
    new SlashCommandBuilder()
        .setName('מדריך')
        .setDescription('הצגת מדריך המשחקייה ותפריט בחירת הסברים על משחקים'),

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
        .setName('הוסף-תיבה')
        .setDescription('הענקת תיבת פנדורה אישית למלאי המאובטח של המשתמש!')
        .addUserOption(option => option.setName('משתמש').setDescription('בחרו את המשתמש שיקבל את התיבה').setRequired(true))
        .addStringOption(option => 
            option.setName('סוג').setDescription('בחרו את סוג התיבה להענקה').setRequired(true)
                .addChoices(
                    { name: '🟢 תיבה רגילה', value: 'regular' },
                    { name: '📦 תיבת עץ', value: 'wood' },
                    { name: '🟡 תיבת זהב', value: 'gold' }
                )
        ),

    new SlashCommandBuilder()
        .setName('איש-תלוי-הפעלות')
        .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
        .addStringOption(option => option.setName('נושא').setDescription('רשמו את נושא המשחק').setRequired(true))
        .addStringOption(option => option.setName('מילה').setDescription('רשמו את המילה הסודית שצריך לנחש').setRequired(true))
        .addAttachmentOption(option => option.setName('תמונה').setDescription('קובץ תמונה מהמחשב (אופציונלי)').setRequired(false))
].map(command => command.toJSON());

// אירוע עליית הבוט לאוויר ודחיפת הפקודות בכוח לדיסקורד
client.once('ready', async () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
    
    // מנגנון ה-REST שדוחף את פקודות הסלאש ישירות לחשבון הבוט
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('מתחיל לרענן ולרשום את פקודות הסלאש בדיסקורד...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );
        console.log('✅ הצלחה! כל פקודות הסלאש עודכנו וסונכרנו בהצלחה בדיסקורד!');
    } catch (error) {
        console.error('❌ שגיאה חמורה ברישום הפקודות ישירות מול דיסקורד:', error);
    }
});

// פונקציית ייצור תפריט משחקים
function createGamesSelectMenu() {
    const select = new StringSelectMenuBuilder()
        .setCustomId('game_guide_select')
        .setPlaceholder('לחץ כאן למידע על משחקים')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('ארץ עיר').setValue('game_country_city').setEmoji('🌍'),
            new StringSelectMenuOptionBuilder().setLabel('תפוס שם').setValue('game_catch_name').setEmoji('❗'),
            new StringSelectMenuOptionBuilder().setLabel('הראשון ש...').setValue('game_first_to').setEmoji('🐱'),
            new StringSelectMenuOptionBuilder().setLabel('מילים מבולבלות').setValue('game_scrambled').setEmoji('😳'),
            new StringSelectMenuOptionBuilder().setLabel('מילה אות').setValue('game_word_letter').setEmoji('⭐')
        );
    return new ActionRowBuilder().addComponents(select);
}

// קולט אינטראקציות (פקודות סלאש ותפריטים)
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'מדריך') {
                const mainEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('📚 מדריך המשחקייה - טרופידון')
                    .setDescription(
                        `כאן תוכלו לשחק במשחקים שונים, ליהנות, להשתפר ולהרוויח פרסים שווים במיוחד.\n\n` +
                        `**הפקודות פועלות אך ורק בחדר המשחקייה.**\n` +
                        `כדי להשתמש בהן, הקפידו לכתוב תמיד סימן קריאה (!) לפני שם המשחק.\n\n` +
                        `בכל פעם שתשתתפו בפקודה מהמשחקייה, תקבלו אסימונים.\n` +
                        `באמצעות האסימונים ניתן לרכוש תיבות ובעזרתן רולים נדירים.\n\n` +
                        `⚠️ **שימו לב:** שימוש מופרז או ספאם של פקודות רק כדי לצבור אסימונים עלול להוביל לאזהרה חמורה או להרחקה קבועה מהמשחקייה.\n\n` +
                        `**לבוסטרים יש יתרונות מיוחדים:**\n` +
                        `נקודות כפולות על כל שימוש, וכן הטבות נוספות בחנויות ובעדכונים.\n\n` +
                        `את כמות האסימונים שלכם תוכלו לבדוק בעזרת הפקודה \`!תיק\`.\n` +
                        `אם תתייגו משתמש אחר אחרי הפקודה, תוכלו לראות את התיק שלו במקום את שלכם.\n\n` +
                        `**ומה עושים עם האסימונים?**\n` +
                        `אפשר לרכוש בעזרתם רולים יוקרתיים!\n` +
                        `לרכישת רולים הקלידו \`!חנות\`, ושם תראו את מחירי הרולים.\n\n` +
                        `**מאחלים לכם המון בהצלחה!**\n` +
                        `לפרטים נוספים על משחקים ספציפיים - השתמשו בתפריט המצורף להודעה.`
                    );

                const row = createGamesSelectMenu();
                return await interaction.reply({ embeds: [mainEmbed], components: [row] });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'game_guide_select') {
                const selectedGame = interaction.values[0];
                let gameTitle = '';
                let gameDescription = '';

                if (selectedGame === 'game_country_city') {
                    gameTitle = '🌍 משחק: ארץ עיר';
                    gameDescription = 'הסבר על משחק ארץ עיר:\nהבוט יבחר אות אקראית, והראשון שיכתוב ארץ, עיר, חי, צומח או דומם באות הזו יזכה באסימונים!';
                } else if (selectedGame === 'game_catch_name') {
                    gameTitle = '❗ משחק: תפוס שם';
                    gameDescription = 'הסבר על משחק תפוס שם:\nהבוט יציג שם של דמות או חפץ, ועליכם לתפוס ולכתוב אותו הכי מהר שניתן!';
                } else if (selectedGame === 'game_first_to') {
                    gameTitle = '🐱 משחק: הראשון ש...';
                    gameDescription = 'הסבר על משחק הראשון ש...:\nהבוט יתן משימה מהירה (למשל: הראשון שיכתוב חתול בצ\'אט), מי שמקליד ראשון מנצח!';
                } else if (selectedGame === 'game_scrambled') {
                    gameTitle = '😳 משחק: מילים מבולבלות';
                    gameDescription = 'הסבר על משחק מילים מבולבלות:\nהבוט יבלבל את אותיות המילה (למשל: "חלחונ"), ועליכם לגלות מה המילה המקורית ("שולחן")!';
                } else if (selectedGame === 'game_word_letter') {
                    gameTitle = '⭐ משחק: מילה אות';
                    gameDescription = 'הסבר על משחק מילה אות:\nהבוט יבקש מילה שמתחילה באות מסוימת ומסתיימת באות אחרת, עליכם למצוא מילה מתאימה במהירות!';
                }

                const gameEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(gameTitle)
                    .setDescription(gameDescription)
                    .setFooter({ text: 'תוכלו לבחור משחק אחר בתפריט בכל עת כדי לקרוא עליו.' });

