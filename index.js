const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
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

client.once('ready', () => {
    console.log(`הבוט \${client.user.tag} מחובר ומוכן לעבודה!`);
});

// הקשבה להודעות (עבור הפקודה והתשובות הרגילות)
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

        // פקודת המשחק המעוצב
        if (message.content === '/איש-תלוי-הפעלות') {
            if (activeGames.has(message.channel.id)) {
                return await message.reply('❌ כבר יש משחק איש תלוי פעיל בערוץ הזה!');
            }

            const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
            const gameState = {
                word: secretWord,
                guessedLetters: new Set(),
                maxAttempts: 6,
                wrongAttempts: 0,
                messageId: null
            };

            activeGames.set(message.channel.id, gameState);

            // יצירת ה-Embed המעוצב (כמו בתמונה)
            const embed = new EmbedBuilder()
                .setColor('#0099ff') // פס כחול בצד
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** כללי\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n**המילה המסתורית:**\n\${displayWordStatus(gameState)}\n\n❤️ ניסיונות שנשארו: \`${gameState.maxAttempts - gameState.wrongAttempts}\``)
                .setImage('https://imgur.com'); // תמונת רקע קבועה לאיש תלוי

            // יצירת כפתור לניחוש
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guess_letter_btn')
                    .setLabel('ניחוש אות')
                    .setStyle(ButtonStyle.Primary) // כפתור כחול
            );

            const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });
            gameState.messageId = gameMessage.id;
            return;
        }
    } catch (error) {
        console.error('שגיאה בפקודת הודעה:', error);
    }
});

// הקשבה ללחיצות על כפתורים וחלונות (Interactions)
client.on('interactionCreate', async (interaction) => {
    try {
        // 1. לחיצה על כפתור "ניחוש אות" -> פתיחת חלון קופץ (Modal)
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

        // 2. קבלת האות שהמשתמש הקליד בחלון הקופץ
        if (interaction.isModalSubmit() && interaction.customId === 'guess_letter_modal') {
            const gameState = activeGames.get(interaction.channel.id);
            if (!gameState) {
                return await interaction.reply({ content: '❌ המשחק הזה כבר הסתיים.', ephemeral: true });
            }

            const guess = interaction.fields.getTextInputValue('letter_input_field').trim();
            
            if (gameState.guessedLetters.has(guess)) {
                return await interaction.reply({ content: `האות **\${guess}** כבר נוחשה בעבר!`, ephemeral: true });
            }

            gameState.guessedLetters.add(guess);
            let statusText = '';

            // בדיקה אם האות נכונה או שגויה
            if (gameState.word.includes(guess)) {
                const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
                
                if (isWon) {
                    activeGames.delete(interaction.channel.id);
                    
                    const winEmbed = new EmbedBuilder()
                        .setColor('#1f8b4c') // ירוק
                        .setTitle('🎉 ניצחון במשחק!')
                        .setDescription(`כל הכבוד! המילה המלאה פוענחה בהצלחה.\n\n👑 המילה הייתה: **\${gameState.word}**`);
                    
                    return await interaction.update({ embeds: [winEmbed], components: [] });
                }
                statusText = `✅ האות **\${guess}** נכונה!`;
            } else {
                gameState.wrongAttempts++;
                
                if (gameState.wrongAttempts >= gameState.maxAttempts) {
                    activeGames.delete(interaction.channel.id);
                    
                    const loseEmbed = new EmbedBuilder()
                        .setColor('#992d22') // אדום
                        .setTitle('💀 המשחק נגמר - הפסדתם!')
                        .setDescription(`אזלו הניסיונות שלכם.\n\n💡 המילה המסתורית הייתה: **\${gameState.word}**`);
                        
                    return await interaction.update({ embeds: [loseEmbed], components: [] });
                }
                statusText = `❌ האות **\${guess}** אינה נכונה!`;
            }

            // עדכון ה-Embed המרכזי עם המצב החדש של המילה והניסיונות
            const updatedEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** כללי\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n\({statusText}\n\n**המילה המסתורית:**\n\){displayWordStatus(gameState)}\n\n❤️ ניסיונות שנשארו: \`${gameState.maxAttempts - gameState.wrongAttempts}\``)
                .setImage('https://imgur.com');

            return await interaction.update({ embeds: [updatedEmbed] });
        }
    } catch (error) {
        console.error('שגיאה בעיבוד כפתור או חלון קופץ:', error);
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
