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

// מאגר המשחקים הפעילים בכל ערוץ
const activeGames = new Map();

// הגנה מוחלטת מפני קריסות - מונע מהבוט להיכבות בשגיאות
process.on('unhandledRejection', (reason) => { 
    console.error('נלכדה שגיאה (דלג):', reason); 
});
process.on('uncaughtException', (err) => { 
    console.error('נלכדה שגיאה חמורה (דלג):', err); 
});

// שרת אינטרנט פנימי שמחזיק את הבוט דלוק 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Trofidon is Alive and Running 24/7!\n');
});
server.listen(process.env.PORT || 10000, () => {
    console.log('שרת Keep-Alive פעיל בהצלחה!');
});

// רישום פקודת הסלאש בצורה תקינה ואוטומטית בכל השרתים
client.once('ready', async () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('איש-תלוי-הפעלות')
            .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
            .addStringOption(option => 
                option.setName('נושא')
                    .setDescription('רשמו את נושא המשחק (לדוגמה: כללי, הפעלות, חיות)')
                    .setRequired(true)
            )
            .addStringOption(option => 
                option.setName('מילה')
                    .setDescription('רשמו את המילה הסודית שצריך לנחש')
                    .setRequired(true)
            )
            .addAttachmentOption(option => 
                option.setName('תמונה')
                    .setDescription('לחצו כאן או גררו קובץ תמונה ישירות מהמחשב שלכם (אופציונלי)')
                    .setRequired(false)
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('מתחיל לרשום פקודות סלאש אוטומטית...');
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands },
            );
        }
        console.log('פקודות הסלאש נרשמו בהצלחה!');
    } catch (error) {
        console.error('שגיאה ברישום פקודות סלאש:', error);
    }
});

// הקשבה להודעות בצ'אט (עבור תגובות רגילות וניחושים של המשחק)
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        // התשובות הרגילות שלך
        if (message.content === 'היי') {
            return await message.reply('היי');
        }
        if (message.content === 'מה נשמע טרופידון?') {
            return await message.reply('בסדר... מה איתך?');
        }

        // מנגנון ניחוש אותיות בצ'אט עבור משחק פעיל
        if (activeGames.has(message.channel.id)) {
            const gameState = activeGames.get(message.channel.id);
            const guess = message.content.trim();

            // בודק שמדובר באות אחת בלבד בעברית
            if (guess.length !== 1) return;

            if (gameState.guessedLetters.has(guess)) {
                return await message.reply(`האות **${guess}** כבר נוחשה בעבר! נסו אות אחרת.`);
            }

            gameState.guessedLetters.add(guess);
            let statusText = '';

            if (gameState.word.includes(guess)) {
                const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
                
                if (isWon) {
                    activeGames.delete(message.channel.id);
                    
                    const winEmbed = new EmbedBuilder()
                        .setColor('#1f8b4c') // ירוק
                        .setTitle('🎉 ניצחון במשחק!')
                        .setDescription(`כל הכבוד! המילה המלאה פוענחה בהצלחה.\n\n👑 המילה הייתה: **${gameState.word}**`)
                        .setImage(gameState.image);
                    
                    return await message.reply({ embeds: [winEmbed] });
                }
                statusText = `✅ האות **${guess}** נכונה!`;
            } else {
                statusText = `❌ האות **${guess}** אינה נכונה! (אין הגבלת ניסיונות, המשיכו לנסות)`;
            }

            const updatedEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** ${gameState.subject}\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n${statusText}\n\n**המילה המסתורית:**\n${displayWordStatus(gameState)}`)
                .setImage(gameState.image);

            return await message.reply({ embeds: [updatedEmbed] });
        }

    } catch (error) {
        console.error('שגיאה בעיבוד הודעה:', error);
    }
});

// הקשבה להפעלת פקודת הסלאש
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'איש-תלוי-הפעלות') {
            if (activeGames.has(interaction.channel.id)) {
                return await interaction.reply({ content: '❌ כבר יש משחק איש תלוי פעיל בערוץ הזה!', ephemeral: true });
            }

            const subject = interaction.options.getString('נושא');
            const customWord = interaction.options.getString('מילה').trim();
            
            const imageAttachment = interaction.options.getAttachment('תמונה');
            let imageUrl = imageAttachment ? imageAttachment.url : 'https://imgur.com';

            const gameState = {
                word: customWord,
                guessedLetters: new Set(),
                subject: subject,
                image: imageUrl
            };

            activeGames.set(interaction.channel.id, gameState);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** ${gameState.subject}\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n**המילה המסתורית:**\n${displayWordStatus(gameState)}`)
                .setImage(gameState.image);

            return await interaction.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('שגיאה באינטראקציה:', error);
    }
});

// פונקציה להצגת קווים תחתונים
function displayWordStatus(gameState) {
    let display = '';
    for (const letter of gameState.word) {
        display += gameState.guessedLetters.has(letter) ? ` ${letter} ` : ' ＿ ';
    }
    return '`' + display.trim() + '`';
}

client.login(process.env.DISCORD_TOKEN);
