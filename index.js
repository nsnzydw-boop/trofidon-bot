const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    REST,
    Routes,
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

// הגנה מוחלטת מפני קריסות
process.on('unhandledRejection', (reason) => { 
    console.error('נלכדה שגיאה (דלג):', reason); 
});
process.on('uncaughtException', (err) => { 
    console.error('נלכדה שגיאה חמורה (דלג):', err); 
});

// שרת אינטרנט פנימי לשמירה על הבוט ער 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Trofidon is Alive and Running 24/7!\n');
});
server.listen(process.env.PORT || 10000, () => {
    console.log('שרת Keep-Alive פעיל בהצלחה!');
});

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

// קישורי התמונות שהעלית לתיבות
const images = {
    regular: {
        closed: 'https://imgur.com', // תיבה ירוקה סגורה
        opened: 'https://imgur.com'   // תיבה ירוקה פתוחה
    },
    wood: {
        closed: 'https://imgur.com', // תיבת עץ סגורה
        opened: 'https://imgur.com'   // תיבת עץ פתוחה
    },
    gold: {
        closed: 'https://imgur.com', // תיבת זהב סגורה
        opened: 'https://imgur.com'   // תיבת זהב פתוחה
    }
};

// רישום פקודות הסלאש אוטומטית בדיסקורד
client.once('ready', async () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
    
    const commands = [
        // 1. פקודת איש תלוי
        new SlashCommandBuilder()
            .setName('איש-תלוי-הפעלות')
            .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
            .addStringOption(option => option.setName('נושא').setDescription('רשמו את נושא המשחק').setRequired(true))
            .addStringOption(option => option.setName('מילה').setDescription('רשמו את המילה הסודית שצריך לנחש').setRequired(true))
            .addAttachmentOption(option => option.setName('תמונה').setDescription('קובץ תמונה מהמחשב (אופציונלי)').setRequired(false)),
            
        // 2. פקודת תיבות הפנדורה
        new SlashCommandBuilder()
            .setName('פתח-תיבה')
            .setDescription('זמינות של תיבת פנדורה לפתיחה בשרת!')
            .addStringOption(option => 
                option.setName('סוג')
                    .setDescription('בחרו את סוג התיבה שברצונכם להציב')
                    .setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('מתחיל לרשום פקודות סלאש...');
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
        }
        console.log('כל פקודות הסלאש נרשמו בהצלחה!');
    } catch (error) {
        console.error('שגיאה ברישום פקודות:', error);
    }
});

// הקשבה להודעות בצ'אט (תגובות רגילות וניחושי איש תלוי)
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        if (message.content === 'היי') return await message.reply('היי');
        if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');

        // מנגנון ניחוש איש תלוי בצ'אט
        if (activeGames.has(message.channel.id)) {
            const gameState = activeGames.get(message.channel.id);
            const guess = message.content.trim();
            if (guess.length !== 1) return;

            if (gameState.guessedLetters.has(guess)) {
                return await message.reply(`האות **${guess}** כבר נוחשה!`);
            }

            gameState.guessedLetters.add(guess);
            let statusText = '';

            if (gameState.word.includes(guess)) {
                const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
                if (isWon) {
                    activeGames.delete(message.channel.id);
                    const winEmbed = new EmbedBuilder().setColor('#1f8b4c').setTitle('🎉 ניצחון!').setDescription(`המילה הייתה: **${gameState.word}**`).setImage(gameState.image);
                    return await message.reply({ embeds: [winEmbed] });
                }
                statusText = `✅ האות **${guess}** נכונה!`;
            } else {
                statusText = `❌ האות **${guess}** אינה נכונה!`;
            }

            const updatedEmbed = new EmbedBuilder().setColor('#0099ff').setTitle('🎯 איש תלוי').setDescription(`• **הנושא:** ${gameState.subject}\n\n${statusText}\n\n**המילה:**\n${displayWordStatus(gameState)}`).setImage(gameState.image);
            return await message.reply({ embeds: [updatedEmbed] });
        }
    } catch (error) { console.error(error); }
});

// הקשבה לפקודות סלאש ולחיצות על כפתור פתיחת התיבה
client.on('interactionCreate', async (interaction) => {
    try {
        // 1. הפעלת פקודת הסלאש /פתח-תיבה (מציב תיבה סגורה בשרת)
        if (interaction.isChatInputCommand() && interaction.commandName === 'פתח-תיבה') {
            const boxType = interaction.options.getString('סוג');
            let boxName, embedColor, closedImage;

            if (boxType === 'regular') {
                boxName = 'תיבה רגילה ירוקה 🟢';
                embedColor = '#2ecc71';
                closedImage = images.regular.closed;
            } else if (boxType === 'wood') {
                boxName = 'תיבת עץ 📦';
                embedColor = '#e67e22';
                closedImage = images.wood.closed;
            } else if (boxType === 'gold') {
                boxName = 'תיבת זהב 🟡';
                embedColor = '#f1c40f';
                closedImage = images.gold.closed;
            }

            const startEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎁 תיבת פנדורה הגיעה לשרת!')
                .setDescription(`מנהל הציב **${boxName}** מוזהבת ומסתורית בצ'אט!\n\n🔹 **מה צריך לעשות?**\nכל מה שנותר לכם הוא ללחוץ על כפתור ה-**"פתח תיבה"** למטה כדי לפתוח אותה ולגלות במה זכיתם!`)
                .setImage(closedImage); // תמונה גדולה ומרכזית של התיבה הסגורה!

            // יצירת כפתור לפתיחת התיבה
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_box_${boxType}`)
                    .setLabel('פתח תיבה 🔓')
                    .setStyle(ButtonStyle.Success)
            );

            return await interaction.reply({ embeds: [startEmbed], components: [row] });
        }

        // 2. לחיצה על כפתור פתיחת התיבה (משנה לתמונה פתוחה ומגריל פרס)
        if (interaction.isButton() && interaction.customId.startsWith('open_box_')) {
            const boxType = interaction.customId.replace('open_box_', '');
            let prizeList, boxName, embedColor, openedImage;

            if (boxType === 'regular') {
                prizeList = regularPrizes;
                boxName = 'תיבה רגילה ירוקה 🟢';
                embedColor = '#2ecc71';
                openedImage = images.regular.opened;
            } else if (boxType === 'wood') {
                prizeList = woodPrizes;
                boxName = 'תיבת עץ 📦';
                embedColor = '#e67e22';
                openedImage = images.wood.opened;
            } else if (boxType === 'gold') {
                prizeList = goldPrizes;
                boxName = 'תיבת זהב 🟡';
                embedColor = '#f1c40f';
                openedImage = images.gold.opened;
            }

            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];

            const finalEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎉 התיבה נפתחה בהצלחה!')
                .setDescription(`המפתח הסתובב... ונפתחה **${boxName}** על ידי המשתמש ${interaction.user}!\n\n✨ **והפרס שזכיתם בו הוא:** ✨\n> **${randomPrize}**\n\n*בהצלחה, ומי יודע... אולי הפרס הבא שלכם יהיה נדיר במיוחד!*`)
                .setImage(openedImage); // תמונה גדולה ומרכזית של התיבה הפתוחה!

            return await interaction.update({ embeds: [finalEmbed], components: [] });
        }

        // 3. קוד הפעלת איש תלוי
        if (interaction.isChatInputCommand() && interaction.commandName === 'איש-תלוי-הפעלות') {
            if (activeGames.has(interaction.channel.id)) {
                return await interaction.reply({ content: '❌ כבר יש משחק פעיל בערוץ זה!', ephemeral: true });
            }
            const gameState = {
                word: interaction.options.getString('מילה').trim(),
                guessedLetters: new Set(),
                subject: interaction.options.getString('נושא'),
                image: interaction.options.getAttachment('תמונה') ? interaction.options.getAttachment('תמונה').url : 'https://imgur.com'
            };
            activeGames.set(interaction.channel.id, gameState);
            const embed = new EmbedBuilder().setColor('#0099ff').setTitle('🎯 איש תלוי').setDescription(`• **הנושא:** ${gameState.subject}\n\n**המילה:**\n${displayWordStatus(gameState)}`).setImage(gameState.image);
