const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// נתיב לקובץ הנתונים שבו יישמרו התיבות
const dbPath = path.join(__dirname, 'inventory.json');

// פונקציית עזר לקריאת הנתונים מהקובץ
function readData() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
    }
    const data = fs.readFileSync(dbPath);
    return JSON.parse(data);
}

// פונקציית עזר לשמירת הנתונים לקובץ
function writeData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('הוספת-תיבה')
        .setDescription('הוספת תיבה למשתמש ספציפי בשרת')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        
        // שדה 1: בחירת משתמש
        .addUserOption(option => 
            option.setName('משתמש')
                .setDescription('בחר את המשתמש שיקבל את התיבה')
                .setRequired(true))
                
        // שדה 2: בחירת סוג התיבה מתוך רשימה סגורה
        .addStringOption(option => 
            option.setName('סוג-התיבה')
                .setDescription('בחר את סוג התיבה מהרשימה')
                .setRequired(true)
                .addChoices(
                    { name: '📦 תיבת פנדורה', value: 'pandora' },
                    { name: '⭐ תיבת זהב', value: 'gold' },
                    { name: '✉️ תיבה רגילה', value: 'regular' }
                )),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('משתמש');
        const boxType = interaction.options.getString('סוג-התיבה');
        
        // קריאת הנתונים הקיימים
        const db = readData();
        
        // אם המשתמש לא קיים עדיין בקובץ, ניצור לו פרופיל ריק
        if (!db[targetUser.id]) {
            db[targetUser.id] = {
                username: targetUser.username,
                boxes: {
                    pandora: 0,
                    gold: 0,
                    regular: 0
                }
            };
        }
        
        // הוספת התיבה לסוג שנבחר
        db[targetUser.id].boxes[boxType] += 1;
        
        // שמירת השינויים חזרה לקובץ
        writeData(db);

        // שמות התיבות בעברית לצורך תצוגה בהודעה המאושרת
        const boxNamesHebrew = {
            pandora: 'פנדורה',
            gold: 'זהב',
            regular: 'רגילה'
        };

        await interaction.reply({
            content: `🎁 **התיבה נוספה ונשמרה בהצלחה!**\n👤 **שם המשתמש:** ${targetUser}\n📦 **סוג התיבה:** ${boxNamesHebrew[boxType]} (יש לו כעת: ${db[targetUser.id].boxes[boxType]})`,
            ephemeral: false
        });
    },
};
