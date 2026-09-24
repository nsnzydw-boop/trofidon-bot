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
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר המשחקים הפעילים של איש תלוי (זמני בלבד בזמן משחק)
const activeGames = new Map();

// נתיב לקובץ האחסון הקבוע של התיבות
const DB_FILE = path.join(__dirname, 'inventory_db.json');

// פונקציות עזר לקריאה ושמירה חסינות קריסה מהדיסק הקשיח
function loadInventory() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf-8');
            return {};
        }
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('שגיאה בטעינת המלאי מהקובץ:', error);
        return {};
    }
}

function saveInventory(inventory) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(inventory, null, 4), 'utf-8');
    } catch (error) {
        console.error('שגיאה בשמירת המלאי לקובץ:', error);
    }
}

// הגנה מוחלטת מפני קריסות (תופס שגיאות ומונע מהתהליך למות)
process.on('unhandledRejection', (reason) => { console.error('נלכדה שגיאה (Rejection):', reason); });
process.on('uncaughtException', (err) => { console.error('נלכדה שגיאה חמורה (Exception):', err); });

// שרת אינטרנט פנימי לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon" }));
});
server.listen(process.env.PORT || 10000, () => {
    console.log('שרת ה-Web הפנימי מוכן ומקשיב לפורט!');
});

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

// קישורי התמונות המקוריים של התיבות
const images = {
    regular: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    wood: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    gold: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' }
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
    ];

    try {
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await client.application.commands.set(commandsData, guildId).catch(() => null);
        }
        console.log('כל פקודות הסלאש עודכנו בשרתים בהצלחה!');
    } catch (error) { console.error('שגיאה ברישום פקודות:', error); }
});

// הקשבה להודעות בצ'אט
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        
        if (message.content === 'היי') return await message.reply('היי');
        if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

        // 1. פקודת !say
        if (message.content.startsWith('!say')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const text = message.content.replace('!say', '').trim();
            if (!text) return await message.reply('❌ נא לרשום טקסט אחרי הפקודה.');
            await message.delete().catch(() => null);
            return await message.channel.send({ content: text });
        }

        // 2. פקודת !פתח-תיבה (כללית לכולם בצ'אט עם כפתור)
        if (message.content.startsWith('!פתח-תיבה')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const args = message.content.split(' ');
            let boxType = args[1];
            if (boxType === 'זהב') boxType = 'gold'; 
            else if (boxType === 'עץ') boxType = 'wood'; 
            else if (boxType === 'רגיל' || boxType === 'רגילה') boxType = 'regular';

            if (!['regular', 'wood', 'gold'].includes(boxType)) return await message.reply('⚠️ שימוש: `!פתח-תיבה [רגיל / עץ / זהב]`');
            
            let boxName, embedColor, closedImage;
            if (boxType === 'regular') { boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = 0x2ecc71; closedImage = images.regular.closed; }
            else if (boxType === 'wood') { boxName = 'תיבת עץ 📦'; embedColor = 0xe67e22; closedImage = images.wood.closed; }
            else if (boxType === 'gold') { boxName = 'תיבת זהב 🟡'; embedColor = 0xf1c40f; closedImage = images.gold.closed; }

            const startEmbed = new EmbedBuilder().setColor(embedColor).setTitle('🎁 תיבת פנדורה הגיעה לשרת!').setDescription(`מנהל הציב **${boxName}** בצ'אט!\n\nלחצו על הכפתור למטה כדי לפתוח!`).setImage(closedImage);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`open_box_global_${boxType}`).setLabel('פתח תיבה 🔓').setStyle(ButtonStyle.Success));
            return await message.channel.send({ embeds: [startEmbed], components: [row] });
        }

        // 3. פקודת !הוסף-תיבה (הוספה למלאי השמור והקבוע)
        if (message.content.startsWith('!הוסף-תיבה')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const args = message.content.split(' ');
            const targetUser = message.mentions.users.first();
            let boxType = args[2];
            if (boxType === 'זהב') boxType = 'gold'; 
            else if (boxType === 'עץ') boxType = 'wood'; 
            else if (boxType === 'רגיל' || boxType === 'רגילה') boxType = 'regular';

            if (!targetUser || !['regular', 'wood', 'gold'].includes(boxType)) {
                return await message.reply('⚠️ שימוש: `!הוסף-תיבה [@משתמש] [רגיל / עץ / זהב]`');
            }

            const inventory = loadInventory();
            if (!inventory[targetUser.id]) inventory[targetUser.id] = [];
            
            inventory[targetUser.id].push(boxType);
            saveInventory(inventory);

            let boxName = boxType === 'regular' ? 'תיבה רגילה ירוקה 🟢' : boxType === 'wood' ? 'תיבת עץ 📦' : 'תיבת זהב 🟡';
            const notifyEmbed = new EmbedBuilder().setColor(0x3498db).setTitle('💰 המלאי האישי עודכן!').setDescription(`הוענקה **${boxName}** בהצלחה למלאי המאובטח של ${targetUser}!\n\n💬 המשתמש יכול כעת לרשום בצ'אט: \`!פתחתיבה\` כדי לפתוח אותה!`).setFooter({ text: `סה"כ תיבות במלאי שלו: ${inventory[targetUser.id].length}` });
            return await message.reply({ embeds: [notifyEmbed] });
        }

        // 4. פקודת !פתחתיבה אישית (הקוד שהיה חסר!)
        if (message.content === '!פתחתיבה') {
            const userId = message.author.id;
            const inventory = loadInventory();
            const userBoxes = inventory[userId] || [];

            if (userBoxes.length === 0) {
                return await message.reply('❌ אין לך אף תיבה במלאי האישי! תבקש ממנהל שיוסיף לך.');
            }

            // לוקח את התיבה האחרונה שקיבל
            const boxType = userBoxes.pop(); 
            inventory[userId] = userBoxes;
            saveInventory(inventory); // שמירה מיידית לקובץ כדי שלא יקרוס וישוכפל

            let prizes = boxType === 'gold' ? goldPrizes : boxType === 'wood' ? woodPrizes : regularPrizes;
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
            
