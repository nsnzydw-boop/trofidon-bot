const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
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

// מאגר המשחקים הפעילים
const activeGames = new Map();

// הגנה מושלמת מפני קריסות
process.on('unhandledRejection', (reason, promise) => {
    console.error('נלכדה שגיאה לא מטופלת:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('נלכדה שגיאה חמורה:', err);
});

// יצירת שרת אינטרנט פנימי קטן שמחזיק את הבוט דלוק 24/7 ב-Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Trofidon is Alive!\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`שרת המניעה מאופליין פועל על פורט ${PORT}`);
});

// רישום פקודת הסלאש עם אפשרות להעלאת קובץ תמונה ישירות מהמחשב
client.once('ready', async () => {
    console.log('טרופידון מחובר ומוכן לעבודה!');
    
    const commands = [
        new SlashCommandBuilder()
            .setName('איש-תלוי-הפעלות')
            .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
            // תבנית 1: נושא המשחק
            .addStringOption(option => 
                option.setName('נושא')
                    .setDescription('רשמו את נושא המשחק (לדוגמה: כללי, הפעלות, חיות)')
                    .setRequired(true)
            )
            // תבנית 2: המילה הסודית למשחק
            .addStringOption(option => 
                option.setName('מילה')
                    .setDescription('רשמו את המילה הסודית שצריך לנחש')
                    .setRequired(true)
            )
            // תבנית 3 משודרגת: העלאת קובץ תמונה ישירות מהמחשב!
            .addAttachmentOption(option => 
                option.setName('תמונה')
                    .setDescription('לחצו כאן או גררו קובץ תמונה ישירות מהמחשב שלכם (אופציונלי)')
                    .setRequired(false)
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('מתחיל לרשום פקודות סלאש אוטומטית עם אפשרות העלאת קבצים...');
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands },
            );
        }
        console.log('פקודות הסלאש החדשות נרשמו בשרתים בהצלחה!');
    } catch (error) {
        console.error('שגיאה ברישום פקודות סלאש:', error);
    }
});

// הקשבה להודעות רגילות
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        if (message.content === 'היי') {
            return await message.reply('היי');
        }
        if (message.content === 'מה נשמע טרופידון?') {
            return await message.reply('בסדר... מה איתך?');
        }
    } catch (error) {
        console.error('שגיאה בהודעה רגילה:', error);
    }
});

// הקשבה לפקודות סלאש ואינטראקציות
client.on('interactionCreate', async (interaction) => {
    try {
        // 1. הפעלת פקודת הסלאש /איש-תלוי-הפעלות
        if (interaction.isChatInputCommand() && interaction.commandName === 'איש-תלוי-הפעלות') {
            if (activeGames.has(interaction.channel.id)) {
                return await interaction.reply({ content: '❌ כבר יש משחק איש תלוי פעיל בערוץ הזה!', ephemeral: true });
            }

            const subject = interaction.options.getString('נושא');
            const customWord = interaction.options.getString('מילה').trim();
            
            // קריאת קובץ התמונה שהועלה מהמחשב
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
                .setDescription('• **הנושא הוא:** ' + gameState.subject + '\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n**המילה המסתורית:**\n' + displayWordStatus(gameState))
                .setImage(gameState.image);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guess_letter_btn')
                    .setLabel('ניחוש אות')
                    .setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // 2. לחיצה על כפתור "ניחוש אות" -> חלון קופץ
        if (interaction.isButton() && interaction.customId === 'guess_letter_btn') {
            const gameState = activeGames.get(interaction.channel.id);
            if (!gameState) {
                return await interaction.reply({ content: '❌ המשחק הזה כבר הסתיים.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('guess_letter_modal')
                .setTitle('ניחוש אות באיש תלוי');

            const letterInput = new TextInputBuilder()
                .setCustomId('letter_input_field')
                .setLabel('הקלידו אות אחת בעברית:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(1)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(letterInput);
            modal.addComponents(firstActionRow);

            return await interaction.showModal(modal);
        }

        // 3. קבלת האות מהחלון הקופץ
        if (interaction.isModalSubmit() && interaction.customId === 'guess_letter_modal') {
            const gameState = activeGames.get(interaction.channel.id);
            if (!gameState) {
                return await interaction.reply({ content: '❌ המשחק הזה כבר הסתיים.', ephemeral: true });
            }

            const guess = interaction.fields.getTextInputValue('letter_input_field').trim();
            
            if (gameState.guessedLetters.has(guess)) {
                return await interaction.reply({ content: 'האות **' + guess + '** כבר נוחשה בעבר!', ephemeral: true });
            }

            gameState.guessedLetters.add(guess);
            let statusText = '';

            if (gameState.word.includes(guess)) {
                const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
                
                if (isWon) {
                    activeGames.delete(interaction.channel.id);
                    
                    const winEmbed = new EmbedBuilder()
                        .setColor('#1f8b4c')
                        .setTitle('🎉 ניצחון במשחק!')
                        .setDescription('כל הכבוד! המילה המלאה פוענחה בהצלחה.\n\n👑 המילה הייתה: **' + gameState.word + '**')
                        .setImage(gameState.image);
                    
                    return await interaction.update({ embeds: [winEmbed], components: [] });
                }
                statusText = '✅ האות **' + guess + '** נכונה!';
            } else {
                statusText = '❌ האות **' + guess + '** אינה נכונה! (אין הגבלת ניסיונות, המשיכו לנסות)';
            }

            const updatedEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription('• **הנושא הוא:** ' + gameState.subject + '\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n' + statusText + '\n\n**המילה המסתורית:**\n' + displayWordStatus(gameState))
                .setImage(gameState.image);

            return await interaction.update({ embeds: [updatedEmbed] });
        }
    } catch (error) {
        console.error('שגיאה בעיבוד פקודת סלאש או כפתור:', error);
    }
});

// פונקציה להצגת המילה
function displayWordStatus(gameState) {
    let display = '';
    for (const letter of gameState.word) {
        if (gameState.guessedLetters.has(letter)) {
            display += ' ' + letter + ' ';
        } else {
            display += ' ＿ ';
        }
    }
    return '`' + display.trim() + '`';
}

client.login(process.env.DISCORD_TOKEN);
