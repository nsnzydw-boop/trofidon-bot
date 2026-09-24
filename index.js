const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
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
    res.end(JSON.stringify({ status: "alive", bot: "Trofidon" }));
});
server.listen(process.env.PORT || 10000);

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

client.once('ready', () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
});

// הקשבה להודעות בצ'אט (תגובות רגילות, ניחושי איש תלוי, ופקודות טקסט חסינות)
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        
        if (message.content === 'היי') return await message.reply('היי');
        if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

        // 🔥 פקודת !הוסף-תיבה החדשה והחסינה בצ'אט!
        // דוגמה להפעלה: !הוסף-תיבה @Ido gold
        if (message.content.startsWith('!הוסף-תיבה')) {
            // 🔒 אבטחה: רק בעל הבוט יכול לתת תיבות בצ'אט
            if (message.author.id !== OWNER_ID) {
                return await message.reply('❌ אין לך הרשאות להשתמש בפקודה ניהולית זו.');
            }

            const args = message.content.split(' ');
            const targetUser = message.mentions.users.first();
            let boxType = args[2] ? args[2].toLowerCase() : '';

            // תרגום מילים בעברית לסוג התיבה בקוד
            if (boxType === 'זהב' || boxType === 'gold') boxType = 'gold';
            else if (boxType === 'עץ' || boxType === 'wood') boxType = 'wood';
            else if (boxType === 'רגיל' || boxType === 'regular') boxType = 'regular';

            if (!targetUser || !['regular', 'wood', 'gold'].includes(boxType)) {
                return await message.reply('⚠️ **איך מפעילים?** תכתוב בצורה הזו:\n`!הוסף-תיבה [@משתמש] [רגיל / עץ / זהב]`\n\n*לדוגמה:* `!הוסף-תיבה @Ido זהב`');
            }

            // הוספה לבנק המאובטח
            const currentBoxes = userInventory.get(targetUser.id) || [];
            currentBoxes.push(boxType);
            userInventory.set(targetUser.id, currentBoxes);

            let boxName;
            if (boxType === 'regular') boxName = 'תיבה רגילה ירוקה 🟢';
            else if (boxType === 'wood') boxName = 'תיבת עץ 📦';
            else if (boxType === 'gold') boxName = 'תיבת זהב 🟡';

            const notifyEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('💰 המלאי האישי עודכן!')
                .setDescription(`הוענקה **${boxName}** בהצלחה למלאי המאובטח של ${targetUser}!\n\n💬 המשתמש יכול כעת לרשום בצ'אט: \`!פתחתיבה\` כדי לפתוח אותה!`)
                .setFooter({ text: `סה"כ תיבות במלאי שלו: ${currentBoxes.length}` });

            return await message.reply({ embeds: [notifyEmbed] });
        }

        // 🔥 פקודת !פתחתיבה לפתיחת המלאי האישי
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
                if (isWon) { activeGames.delete(message.channel.id); const winEmbed = new EmbedBuilder().setColor('#1f8b4c').setTitle('🎉 ניצחון!').setDescription(`Mהמילה הייתה: **${gameState.word}**`).setImage(gameState.image); return await message.reply({ embeds: [winEmbed] }); }
                statusText = `✅ האות **${guess}** נכונה!`;
            } else { statusText = `❌ האות **${guess}** אינה נכונה!`; }

            const updatedEmbed = new EmbedBuilder().setColor('#0099ff').setTitle('🎯 איש תלוי').setDescription(`• **הנושא:** ${gameState.subject}\n\n${statusText}\n\n**Mילה:**\n${displayWordStatus(gameState)}`).setImage(gameState.image);
            return await message.reply({ embeds: [updatedEmbed] });
        }
    } catch (error) { console.error(error); }
});

// הקשבה ללחיצות על כפתורים
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('open_box_')) {
            const parts = interaction.customId.split('_');
            const boxType = parts[2];
            const allowedUserId = parts[3];

            if (allowedUserId && interaction.user.id !== allowedUserId) {
                return await interaction.reply({ content: '❌ התיבה הזו שייכת למשתמש אחר בלבד!', ephemeral: true });
            }

            let prizeList, boxName, embedColor, openedImage;
            if (boxType === 'regular') { prizeList = regularPrizes; boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; openedImage = images.regular.opened; }
            else if (boxType === 'wood') { prizeList = woodPrizes; boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; openedImage = images.wood.opened; }
            else if (boxType === 'gold') { prizeList = goldPrizes; boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; openedImage = images.gold.opened; }

            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];
            const finalEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎉 התיבה נפתחה בהצלחה!')
                .setDescription(`👑 המפתח הסתובב... ונפתחה **${boxName}** על ידי המשתמש ${interaction.user}!\n\n✨ **והפרס שזכיתם בו הוא:** ✨\n> **${randomPrize}**`)
                .setImage(openedImage);

            return await interaction.update({ embeds: [finalEmbed], components: [] });
        }
    } catch (error) { console.error(error); }
});

function displayWordStatus(gameState) {
    let display = '';
    for (const letter of gameState.word) { display += gameState.guessedLetters.has(letter) ? ` ${letter} ` : ' ＿ '; }
    return '`' + display.trim() + '`';
}

client.login(process.env.DISCORD_TOKEN);
