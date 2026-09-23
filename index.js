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
    res.end('Trofidon is Alive!\n');
});
server.listen(process.env.PORT || 10000);

// רשימות הפרסים לתיבות
const regularPrizes = ['נקודות לשרת', 'תפקיד זמני מעוצב', 'פרס ניחומים: כלום!', 'גישה לערוץ סודי ל-24 שעות'];
const woodPrizes = ['תפקיד מיוחד בשרת', 'תקשורת חופשית עם מנהל', 'כרטיס הגרלה חינמי'];
const goldPrizes = ['👑 מפתח לפעילות VIP', '💎 תפקיד אלוף השרת לתמיד', '🎁 קופון מתנה מיוחד מהנהלת השרת'];

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

// רישום פקודות סלאש ישירות לתוך השרת שלך באופן אוטומטי
client.once('ready', async () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
    
    const commandsData = [
        // 1. פקודת SAY הרשמית שאתה רוצה!
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('גורם לבוט לשלוח הודעה מותאמת אישית שלכם בצ׳אט')
            .addStringOption(option => 
                option.setName('תוכן')
                    .setDescription('רשמו את מה שאתם רוצים שהבוט יגיד')
                    .setRequired(true)
            ),
            
        // 2. פקודת פתח תיבה
        new SlashCommandBuilder()
            .setName('פתח-תיבה')
            .setDescription('זמינות של תיבת פנדורה לפתיחה בשרת!')
            .addStringOption(option => 
                option.setName('סוג')
                    .setDescription('בחרו את סוג התיבה')
                    .setRequired(true)
                    .addChoices(
                        { name: '🟢 תיבה רגילה', value: 'regular' },
                        { name: '📦 תיבת עץ', value: 'wood' },
                        { name: '🟡 תיבת זהב', value: 'gold' }
                    )
            )
    ];

    try {
        console.log('מתחיל רישום ישיר ומיידי לשרתים שלך...');
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            // רושם את הפקודות ישירות בתוך השרת הספציפי שלך בשנייה זו!
            await client.application.commands.set(commandsData, guildId);
        }
        console.log('הפקודות עודכנו בשרת שלך בהצלחה ומפעילות את עצמן עכשיו!');
    } catch (error) {
        console.error('שגיאה ברישום:', error);
    }
});

// הקשבה להודעות רגילות
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === 'היי') return await message.reply('היי');
    if (message.content === 'מה נשמע טרופידון?') return await message.reply('בסדר... מה איתך?');
});

// הקשבה לפקודות סלאש ואינטראקציות
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

        // הפעלת פקודת SAY
        if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
            const messageContent = interaction.options.getString('תוכן');
            
            // שולח הודעה ירוקה ונסתרת שרק אתה רואה, כדי לאשר שהפקודה בוצעה
            await interaction.reply({ content: '✅ ההודעה נשלחה בהצלחה!', ephemeral: true });
            
            // שולח את ההודעה הרגילה לצ'אט בשם הבוט
            return await interaction.channel.send({ content: messageContent });
        }

        // פקודת פתח-תיבה
        if (interaction.isChatInputCommand() && interaction.commandName === 'פתח-תיבה') {
            const boxType = interaction.options.getString('סוג');
            let boxName, embedColor, closedImage;

            if (boxType === 'regular') { boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; closedImage = images.regular.closed; }
            else if (boxType === 'wood') { boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; closedImage = images.wood.closed; }
            else if (boxType === 'gold') { boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; closedImage = images.gold.closed; }

            const startEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎁 תיבת פנדורה הגיעה לשרת!')
                .setDescription(`מנהל הציב **${boxName}** מוזהבת ומסתורית בצ'אט!\n\nלחצו על הכפתור למטה כדי לפתוח!`)
                .setImage(closedImage);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`open_box_${boxType}`).setLabel('פתח תיבה 🔓').setStyle(ButtonStyle.Success)
            );

            return await interaction.reply({ embeds: [startEmbed], components: [row] });
        }

        // לחיצה על כפתור פתיחת התיבה
        if (interaction.isButton() && interaction.customId.startsWith('open_box_')) {
            const boxType = interaction.customId.replace('open_box_', '');
            let prizeList, boxName, embedColor, openedImage;

            if (boxType === 'regular') { prizeList = regularPrizes; boxName = 'תיבה רגילה ירוקה 🟢'; embedColor = '#2ecc71'; openedImage = images.regular.opened; }
            else if (boxType === 'wood') { prizeList = woodPrizes; boxName = 'תיבת עץ 📦'; embedColor = '#e67e22'; openedImage = images.wood.opened; }
            else if (boxType === 'gold') { prizeList = goldPrizes; boxName = 'תיבת זהב 🟡'; embedColor = '#f1c40f'; openedImage = images.gold.opened; }

            const randomPrize = prizeList[Math.floor(Math.random() * prizeList.length)];

            const finalEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🎉 התיבה נפתחה בהצלחה!')
                .setDescription(`המפתח הסתובב... ונפתחה **${boxName}** על ידי ${interaction.user}!\n\n✨ **והפרס שזכיתם בו הוא:** ✨\n> **${randomPrize}**`)
                .setImage(openedImage);

            return await interaction.update({ embeds: [finalEmbed], components: [] });
        }
    } catch (error) { console.error(error); }
});

client.login(process.env.DISCORD_TOKEN);
