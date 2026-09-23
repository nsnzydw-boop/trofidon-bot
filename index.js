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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר המשחקים הפעילים
const activeGames = new Map();

// רשימת מילים למשחק
const wordsList = ['דיסקורד', 'טרופידון', 'מחשב', 'תכנות', 'שרת', 'בוט', 'משחק'];

// הגנה מושלמת מפני קריסות
process.on('unhandledRejection', (reason, promise) => {
    console.error('נלכדה שגיאה לא מטופלת:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('נלכדה שגיאה חמורה:', err);
});

// רישום פקודת הסלאש אוטומטית בכל השרתים שהבוט נמצא בהם
client.once('ready', async () => {
    console.log('טרופידון מחובר ומוכן לעבודה!');
    
    const commands = [
        new SlashCommandBuilder()
            .setName('איש-תלוי-הפעלות')
            .setDescription('הפעלת משחק איש תלוי מעוצב בשרת')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('מתחיל לרשום פקודות סלאש אוטומטית...');
        
        // הבוט לוקח לבד את הרשימה של השרתים שלו ורושם בהם את הפקודה מיד
        const guilds = await client.guilds.fetch();
        for (const [guildId] of guilds) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commands },
            );
        }
        
        console.log('פקודות הסלאש נרשמו בשרתים בהצלחה ויכולות לעבוד עכשיו!');
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

            const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
            const gameState = {
                word: secretWord,
                guessedLetters: new Set()
            };

            activeGames.set(interaction.channel.id, gameState);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription('• **הנושא הוא:** כללי\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n**המילה המסתורית:**\n' + displayWordStatus(gameState))
                .setImage('https://imgur.com'); // תמונה למשחק

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
                        .setImage('https://imgur.com');
                    
                    return await interaction.update({ embeds: [winEmbed], components: [] });
                }
                statusText = '✅ האות **' + guess + '** נכונה!';
            } else {
                statusText = '❌ האות **' + guess + '** אינה נכונה! (אין הגבלת ניסיונות, המשיכו לנסות)';
            }

            const updatedEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription('• **הנושא הוא:** כללי\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n' + statusText + '\n\n**המילה המסתורית:**\n' + displayWordStatus(gameState))
                .setImage('https://imgur.com');

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
