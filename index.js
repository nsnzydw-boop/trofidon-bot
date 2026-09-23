const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    // הגדרת הפקודה והשדות שלה
    data: new SlashCommandBuilder()
        .setName('הוספת-תיבה')
        .setDescription('הוספת תיבה למשתמש ספציפי בשרת')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // רק מנהלים יכולים להשתמש בפקודה
        
        // שדה 1: שם המשתמש
        .addUserOption(option => 
            option.setName('משתמש')
                .setDescription('בחר את המשתמש שיקבל את התיבה')
                .setRequired(true))
                
        // שדה 2: סוג התיבה
        .addStringOption(option => 
            option.setName('סוג-התיבה')
                .setDescription('בחר או הקלד את סוג התיבה (למשל: פנדורה, זהב, נדירה)')
                .setRequired(true)),

    // מה קורה כשהפקודה מופעלת
    async execute(interaction) {
        // משיכת הנתונים שהמשתמש הזין
        const targetUser = interaction.options.getUser('משתמש');
        const boxType = interaction.options.getString('סוג-התיבה');

        // כאן בעתיד נחבר את הלוגיקה של מסד הנתונים (Database) שלך כדי לשמור את התיבה
        // כרגע הבוט רק יחזיר הודעת אישור מעוצבת

        await interaction.reply({
            content: `🎁 **התיבה נוספה בהצלחה!**\n👤 **שם המשתמש:** ${targetUser}\n📦 **סוג התיבה:** ${boxType}`,
            ephemeral: false // שנה ל-true אם אתה רוצה שרק המנהל שכתב את הפקודה יראה את ההודעה
        });
    },
};
