const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField 
} = require('discord.js');
const http = require('http');

// הגדרת הבוט והרשאות לקריאת הודעות בצ'אט
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר התיבות והמלאי של המשתמשים (במבנה המקורי של השיחה)
const userInventory = new Map();

// הגנה מוחלטת מפני קריסות שרת ב-Render (תופס שגיאות ומונע מהבוט למות)
process.on('unhandledRejection', (reason) => { console.error('נלכדה שגיאה:', reason); });
process.on('uncaughtException', (err) => { console.error('נלכדה שגיאה חמורה:', err); });

// שרת אינטרנט פנימי לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon" }));
});
server.listen(process.env.PORT || 10000);

// רשימות הפרסים המקוריות לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

// קישורי התמונות המקוריים של התיבות
const images = {
    regular: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    wood: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' },
    gold: { closed: 'https://discordapp.com', opened: 'https://discordapp.com' }
};

// הדפסה כשהבוט מתחבר בהצלחה
client.once('ready', () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
});

// מערכת פקודות צ'אט מקורית וחסינת קריסות (עם סימן קריאה !)
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        
        // פקודות דיבור בסיסיות
        if (message.content === 'היי') return await message.reply('היי');
        if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

        // 1. פקודת צ'אט: !say
        if (message.content.startsWith('!say')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const text = message.content.replace('!say', '').trim();
            if (!text) return await message.reply('❌ נא לרשום טקסט אחרי הפקודה.');
            await message.delete().catch(() => null);
            return await message.channel.send({ content: text });
        }

        // 2. פקודת צ'אט: !פתח-תיבה (כללית לכולם עם כפתור)
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

            const startEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎁 תיבת פנדורה הגיעה לשרת!')
                .setDescription(`מנהל הציב **${boxName}** בצ'אט!\n\nלחצו על הכפתור למטה כדי לפתוח!`)
                .setImage(closedImage);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_box_global_${boxType}`)
                    .setLabel('פתח תיבה 🔓')
                    .setStyle(ButtonStyle.Success)
            );

            return await message.channel.send({ embeds: [startEmbed], components: [row] });
        }

        // 3. פקודת צ'אט מקורית: !הוסף-תיבה (הוספה ישירה למלאי המשתמש)
        // דוגמה לשימוש: !הוסף-תיבה עידו זהב
        if (message.content.startsWith('!הוסף-תיבה')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            
            const args = message.content.split(' ');
            if (args.length < 3) {
                return await message.reply('⚠️ שימוש: `!הוסף-תיבה [שם המשתמש] [רגיל / עץ / זהב]` - דוגמה: `!הוסף-תיבה עידו זהב`');
            }

            // מציאת שם המשתמש (או לפי תיוג או לפי הטקסט שהוא רשם)
            const targetUser = message.mentions.users.first();
            let userNameInput = args[1];
            let boxInput = args[2];

            // המרת סוג התיבה לשם המפתח בקוד
            let boxType = boxInput;
            if (boxType === 'זהב') boxType = 'gold'; 
            else if (boxType === 'עץ') boxType = 'wood'; 
            else if (boxType === 'רגיל' || boxType === 'רגילה') boxType = 'regular';

            if (!['regular', 'wood', 'gold'].includes(boxType)) {
                return await message.reply('⚠️ סוג התיבה לא תקין! יש לבחור: רגיל, עץ או זהב.');
            }

            // זיהוי ה-ID של המשתמש שקיבל את התיבה (תומך בתיוג או לפי יוצר הפקודה כגיבוי)
            const userId = targetUser ? targetUser.id : message.author.id;
            const displayName = targetUser ? targetUser.username : userNameInput;

            // עדכון המלאי במאגר
            const currentBoxes = userInventory.get(userId) || [];
            currentBoxes.push(boxType);
            userInventory.set(userId, currentBoxes);

            let boxName = boxType === 'regular' ? 'תיבה רגילה ירוקה 🟢' : boxType === 'wood' ? 'תיבת עץ 📦' : 'תיבת זהב 🟡';
            
            const notifyEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('💰 המלאי האישי עודכן!')
                .setDescription(`הוענקה **${boxName}** בהצלחה למלאי המאובטח של **${displayName}**!\n\n💬 המשתמש יכול כעת לרשום בצ'אט: \`!פתחתיבה\` כדי לפתוח אותה!`)
                .setFooter({ text: `סה"כ תיבות במלאי שלו: ${currentBoxes.length}` });

            return await message.reply({ embeds: [notifyEmbed] });
        }

        // 4. פקודת צ'אט: !פתחתיבה (פתיחת המלאי האישי של מי שרשם)
        if (message.content === '!פתחתיבה') {
            const userId = message.author.id;
            const userBoxes = userInventory.get(userId) || [];

            if (userBoxes.length === 0) {
                return await message.reply('❌ אין לך אף תיבה במלאי האישי! תבקש ממנהל שיוסיף לך באמצעות `!הוסף-תיבה`.');
            }

            // לקיחת התיבה האחרונה מהאוסף
            const boxType = userBoxes.pop();
            userInventory.set(userId, userBoxes);

            let prizes = boxType === 'gold' ? goldPrizes : boxType === 'wood' ? woodPrizes : regularPrizes;
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
            let boxName = boxType === 'regular' ? 'תיבה רגילה 🟢' : boxType === 'wood' ? 'תיבת עץ 📦' : 'תיבת זהב 🟡';

            const openEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🎉 פתחת תיבה מהמלאי שלך!')
                .setDescription(`פתחת בהצלחה **${boxName}** מהאוסף האישי שלך!\n\n🎁 **הפרס שזכית בו:**\n> **${randomPrize}**`)
                .setFooter({ text: `נשארו לך עוד ${userBoxes.length} תיבות במלאי.` });

            return await message.reply({ embeds: [openEmbed] });
        }

    } catch (error) {
        console.error('שגיאה בעיבוד הודעה:', error);
    }
});

// קולט לחיצות הכפתור עבור התיבה הכללית בשרת (!פתח-תיבה)
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('open_box_global_')) {
            const boxType = interaction.customId.replace('open_box_global_', '');
            
            let prizes = boxType === 'gold' ? goldPrizes : boxType === 'wood' ? woodPrizes : regularPrizes;
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
            let openedImage = boxType === 'gold' ? images.gold.opened : boxType === 'wood' ? images.wood.opened : images.regular.opened;

            const winEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔓 התיבה נפתחה!')
                .setDescription(`המשתמש ${interaction.user} היה המהיר ביותר ופתח את התיבה!\n\n🎁 **הפרס שבו זכה:**\n> **${randomPrize}**`)
                .setImage(openedImage);

            await interaction.update({ embeds: [winEmbed], components: [] });
        }
    } catch (error) {
        console.error('שגיאה בלחיצת כפתור:', error);
    }
});

// התחברות לדיסקורד (עושה שימוש בטוקן של רנדר או ישירות)
client.login(process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN_HERE");
