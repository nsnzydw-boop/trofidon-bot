const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
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

// רשימות הפרסים לתיבות (תוכל לשנות את המילים בתוך הגרשיים לכל פרס שתרצה!)
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אללוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

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
            
        // 2. פקודת תיבות הפנדורה החדשה!
        new SlashCommandBuilder()
            .setName('פתח-תיבה')
            .setDescription('פתיחת תיבת פנדורה וקבלת פרס אקראי!')
            .addStringOption(option => 
                option.setName('סוג')
                    .setDescription('בחרו את סוג התיבה שברצונכם לפתוח')
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

// הקשבה לפקודות סלאש (איש תלוי ותיבות הפתעה)
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) return;

        // 1. קוד איש תלוי
        if (interaction.commandName === 'איש-תלוי-הפעלות') {
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
            return await interaction.reply({ embeds: [embed] });
        }

        // 2. קוד פתיחת התיבות החדש!
        if (interaction.commandName === 'פתח-תיבה') {
            const boxType = interaction.options.getString('סוג');
            let prizeList, boxName, embedColor, boxImage;

            // קביעת הגדרות לפי סוג התיבה שנבחרה
            if (boxType === 'regular') {
                prizeList = regularPrizes;
                boxName = 'תיבה רגילה 🟢';
                embedColor = '#2ecc71'; // ירוק
                boxImage = 'https://imgur.com'; // תוכל לשנות לקישור תמונה משלך
            } else if (boxType === 'wood') {
                prizeList = woodPrizes;
                boxName = 'תיבת עץ 📦';
                embedColor = '#e67e22'; // כתום/חום
                boxImage = 'https://imgur.com';
            } else if (boxType === 'gold') {
                prizeList = goldPrizes;
                boxName = 'תיבת זהב 🟡';
                embedColor = '#f1c40f'; // צהוב זהב
                boxImage = 'https://imgur.com';
            }

            // הגרלת פרס אקראי מתוך הרשימה המתאימה
            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];

            // יצירת הודעת הזכייה המעוצבת (Embed)
            const boxEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎁 פתיחת תיבת פנדורה!')
                .setDescription(`המפתח הסתובב... ונפתחה **${boxName}** על ידי ${interaction.user}!\n\n✨ **והפרס שזכיתם בו הוא:** ✨\n> **${randomPrize}**\n\n*בהצלחה, ומי יודע... אולי הפרס הבא שלכם יהיה נדיר במיוחד!*`)
                .setThumbnail(boxImage);

            return await interaction.reply({ embeds: [boxEmbed] });
        }
    } catch (error) { console.error(error); }
});

function displayWordStatus(gameState) {
    let display = '';
    for (const letter of gameState.word) {
        display += gameState.guessedLetters.has(letter) ? ` ${letter} ` : ' ＿ ';
    }
    return '`' + display.trim() + '`';
}

client.login(process.env.DISCORD_TOKEN);
