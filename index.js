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
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר המשחקים הפעילים בכל ערוץ
const activeGames = new Map();

// הגנה מוחלטת מפני קריסות - תופס את כל השגיאות בעולם ומונע מהבוט להיכבות
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

client.once('ready', () => {
    console.log(`טרופידון מחובר בהצלחה בתור ${client.user.tag}!`);
});

// הקשבה להודעות בצ'אט (מריץ את המשחק והתגובות בצורה הכי יציבה שיש)
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

        // פקודת המשחק (במקום סלאש שגורם לקריסות, נשתמש בפקודת טקסט רגילה או הודעה)
        // אם תרצה להפעיל את המשחק, פשוט תרשום בצ'אט: !איש-תלוי
        if (message.content.startsWith('!איש-תלוי')) {
            if (activeGames.has(message.channel.id)) {
                return await message.reply('❌ כבר יש משחק איש תלוי פעיל בערוץ הזה!');
            }

            // חלוקת ההודעה כדי להוציא את הנושא והמילה
            // דוגמה להפעלה: !איש-תלוי חיות אריה
            const args = message.content.split(' ');
            const subject = args[1] || 'כללי';
            const customWord = args[2];

            if (!customWord) {
                return await message.reply('⚠️ **איך מפעילים?** תרשום בצורה הזו:\n`!איש-תלוי [נושא] [מילה]`\n\n*לדוגמה:* `!איש-תלוי חיות אריה` (ותוכל גם לגרור קובץ תמונה להודעה במחשב!)');
            }

            // בדיקה אם הועלתה תמונה מהמחשב להודעה
            const imageAttachment = message.attachments.first();
            let imageUrl = imageAttachment ? imageAttachment.url : 'https://imgur.com';

            const gameState = { 
                word: customWord.trim(), 
                guessedLetters: new Set(), 
                subject: subject, 
                image: imageUrl 
            };
            
            activeGames.set(message.channel.id, gameState);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** ${gameState.subject}\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n**המילה המסתורית:**\n${displayWordStatus(gameState)}`)
                .setImage(gameState.image);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guess_letter_btn')
                    .setLabel('ניחוש אות')
                    .setStyle(ButtonStyle.Primary)
            );

            return await message.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (error) { 
        console.error('שגיאה בעיבוד הודעה:', error); 
    }
});

// הקשבה ללחיצות על כפתורים וחלונות קופצים (Modals)
client.on('interactionCreate', async (interaction) => {
    try {
        // 1. לחיצה על כפתור "ניחוש אות" -> פתיחת חלון קופץ
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

            return await interaction.showModal(modal.addComponents(new ActionRowBuilder().addComponents(letterInput)));
        }

        // 2. קבלת האות מהחלון הקופץ והערכת הניחוש
        if (interaction.isModalSubmit() && interaction.customId === 'guess_letter_modal') {
            const gameState = activeGames.get(interaction.channel.id);
            if (!gameState) {
                return await interaction.reply({ content: '❌ המשחק הזה כבר הסתיים.', ephemeral: true });
            }

            const guess = interaction.fields.getTextInputValue('letter_input_field').trim();
            if (gameState.guessedLetters.has(guess)) {
                return await interaction.reply({ content: `האות **${guess}** כבר נוחשה בעבר!`, ephemeral: true });
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
                        .setDescription(`כל הכבוד! המילה פוענחה בהצלחה.\n\n👑 המילה הייתה: **${gameState.word}**`)
                        .setImage(gameState.image);
                    return await interaction.update({ embeds: [winEmbed], components: [] });
                }
                statusText = `✅ האות **${guess}** נכונה!`;
            } else {
                statusText = `❌ האות **${guess}** אינה נכונה! (אין הגבלת ניסיונות)`;
            }

            const updatedEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 איש תלוי')
                .setDescription(`• **הנושא הוא:** ${gameState.subject}\n• לאחר ניחוש המילה לא תוכלו להשתתף בסבב שנית.\n\n${statusText}\n\n**המילה המסתורית:**\n${displayWordStatus(gameState)}`)
                .setImage(gameState.image);

            return await interaction.update({ embeds: [updatedEmbed] });
        }
    } catch (e) { 
        console.error('שגיאה באינטראקציה:', e); 
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
