const { Client, GatewayIntentBits, MessageCollector } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// מאגר שישמור את המשחקים הפעילים בכל ערוץ
const activeGames = new Map();

// רשימת מילים למשחק (תוכל להוסיף או לשנות כאן מילים כרצונך!)
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

// הקשבה להודעות בצ'אט
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        // התגובות הרגילות שביקשת קודם
        if (message.content === 'היי') {
            return await message.reply('היי');
        }
        if (message.content === 'מה נשמע טרופידון?') {
            return await message.reply('בסדר... מה איתך?');
        }

        // פקודה להפעלת משחק איש תלוי
        if (message.content === '/איש-תלוי-הפעלות') {
            // בדיקה אם כבר יש משחק פעיל בערוץ הזה
            if (activeGames.has(message.channel.id)) {
                return await message.reply('❌ כבר יש משחק איש תלוי פעיל בערוץ הזה!');
            }

            // בחירת מילה אקראית מהרשימה
            const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
            const gameState = {
                word: secretWord,
                guessedLetters: new Set(),
                maxAttempts: 6,
                wrongAttempts: 0
            };

            activeGames.set(message.channel.id, gameState);

            await message.reply(`🎮 **משחק איש תלוי התחיל!**\nהמילה שנבחרה מכילה **\${secretWord.length}** אותיות.\nכתבו אות אחת בצ'אט כדי לנחש!\n\n\${displayWordStatus(gameState)}`);
            return;
        }

        // בדיקה אם ההודעה שנשלחה היא ניחוש למשחק פעיל
        if (activeGames.has(message.channel.id)) {
            const gameState = activeGames.get(message.channel.id);
            const guess = message.content.trim();

            // בודק שמדובר באות אחת בלבד
            if (guess.length !== 1) return;

            // אם האות כבר נוחשה בעבר
            if (gameState.guessedLetters.has(guess)) {
                return await message.reply(`האות **\${guess}** כבר נוחשה! נסו אות אחרת.`);
            }

            gameState.guessedLetters.add(guess);

            // אם הניחוש נכון
            if (gameState.word.includes(guess)) {
                // בדיקה אם השחקנים ניחשו את כל המילה
                const isWon = [...gameState.word].every(letter => gameState.guessedLetters.has(letter));
                
                if (isWon) {
                    activeGames.delete(message.channel.id);
                    return await message.reply(`🎉 **כל הכבוד! ניחשתם את המילה!**\nהמילה הייתה: **\${gameState.word}**`);
                } else {
                    return await message.reply(`✅ אות נכונה!\n\n\${displayWordStatus(gameState)}`);
                }
            } else {
                // אם הניחוש שגוי
                gameState.wrongAttempts++;
                
                if (gameState.wrongAttempts >= gameState.maxAttempts) {
                    activeGames.delete(message.channel.id);
                    return await message.reply(`💀 **הפסדתם! המשחק נגמר.**\nהמילה הייתה: **\${gameState.word}**`);
                } else {
                    return await message.reply(`❌ אות לא נכונה! נשארו לכם עוד \({gameState.maxAttempts - gameState.wrongAttempts} ניסיונות.\n\n\){displayWordStatus(gameState)}`);
                }
            }
        }

    } catch (error) {
        console.error('שגיאה בזמן עיבוד הודעה או משחק:', error);
    }
});

// פונקציית עזר להצגת המילה עם קווים תחתונים
function displayWordStatus(gameState) {
    let display = '';
    for (const letter of gameState.word) {
        if (gameState.guessedLetters.has(letter)) {
            display += ` \${letter} `;
        } else {
            display += ' ＿ ';
        }
    }
    return `\`${display.trim()}\``;
}

client.login(process.env.DISCORD_TOKEN);
