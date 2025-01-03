const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const express = require('express');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
});

const app = express();
const port = 3000;
app.get('/', (req, res) => {
  const imagePath = path.join(__dirname, 'index.html');
  res.sendFile(imagePath);
});
app.listen(port, () => {
  console.log('\x1b[36m[ SERVER ]\x1b[0m', '\x1b[32m SH : http://localhost:' + port + ' ✅\x1b[0m');
});

// In-memory object to store users who have partnered
let partneredUsers = {};

const yourChannelId = '1324665533450420297'; // Replace with your channel ID to send server ad

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

async function login() {
    try {
      await client.login(process.env.TOKEN);
      console.log('\x1b[36m[ LOGIN ]\x1b[0m', `\x1b[32mLogged in as: ${client.user.tag} ✅\x1b[0m`);
      console.log('\x1b[36m[ INFO ]\x1b[0m', `\x1b[35mBot ID: ${client.user.id} \x1b[0m`);
      console.log('\x1b[36m[ INFO ]\x1b[0m', `\x1b[34mConnected to ${client.guilds.cache.size} server(s) \x1b[0m`);
    } catch (error) {
      console.error('\x1b[31m[ ERROR ]\x1b[0m', 'Failed to log in:', error);
      process.exit(1);
    }
  }

client.on('messageCreate', async (message) => {
    // Ignore bot messages and messages not in DMs
    if (message.author.bot || message.guild) return;

    if (message.content.toLowerCase() === 'cancel') {
        // Handle cancellation
        return message.reply(`# Partnership Canceled.\n> You decided to cancel the partnership.\n> If you want to start again, type "**partner**".`);
    }

    if (message.content.toLowerCase().includes('partner')) {
        // Check if the user has already partnered
        if (partneredUsers[message.author.id]) {
            return message.reply(`# You have already partnered with us once. You cannot partner again.`);
        }

        // Send the partnership message
        const responseMessage = await message.reply({
            content: `__**Want to partner?**__\n> - **Yes**, I want to partner.\n> - **No**, I don't want to partner.`,
        });

        // React with checkmark and cross
        await responseMessage.react('✅'); // Checkmark
        await responseMessage.react('❌'); // Cross

        // Create a reaction collector
        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        };

        const reactionCollector = responseMessage.createReactionCollector({ filter, max: 1, time: 300000 }); // 5 minutes

        reactionCollector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '✅') {
                // Send partnership requirements
                const instructionMessage = await message.reply(
                    `# Automated by Best DSmarkets\n> Requirement: 300 members.\n> You can partnership once every hour.\n> Type "cancel" to cancel anytime.`
                );

                // Wait 2 seconds and send the next prompt
                setTimeout(() => {
                    message.reply('Send me your **Discord server ad** to start the partnership.');
                }, 2000);

                // Start a message collector for the "cancel" command
                const cancelFilter = (msg) => msg.author.id === message.author.id && msg.content.toLowerCase() === 'cancel';
                const cancelCollector = message.channel.createMessageCollector({ filter: cancelFilter, time: 300000 }); // 5 minutes

                cancelCollector.on('collect', (msg) => {
                    cancelCollector.stop();
                    reactionCollector.stop();
                    msg.reply(`# Partnership Canceled.\n> You decided to cancel the partnership.\n> If you want to start again, type "**partner**".`);
                });

                cancelCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        instructionMessage.reply('The time to complete the process has expired. Please start again by typing "**partner**".');
                    }
                });

                // Listen for the server ad link from the user
                const linkFilter = (msg) => msg.author.id === message.author.id && msg.content.startsWith('https://discord.gg/');

                const linkCollector = message.channel.createMessageCollector({ filter: linkFilter, time: 300000 }); // 5 minutes

                linkCollector.on('collect', async (msg) => {
                    // Fetch the server information
                    try {
                        const inviteCode = msg.content.split('https://discord.gg/')[1]; // Get the invite code from the URL
                        const invite = await client.fetchInvite(inviteCode); // Fetch the invite details

                        const memberCount = invite.guild.memberCount; // Get the member count of the server

                        if (memberCount >= 300) {
                            // Send the server ad to your channel if the server has enough members
                            const yourChannel = await client.channels.fetch(yourChannelId);
                            yourChannel.send(`Server Ad from ${msg.author.tag}: ${msg.content}`);

                            // Mark the user as having partnered
                            partneredUsers[msg.author.id] = true;
                            msg.reply('The partnership has been successfully started! Your server ad has been sent.');
                        } else {
                            // Inform the user if the server has fewer members
                            msg.reply(`# Not Enough Members.\n> Your server only has **${memberCount} members**, the required amount is **300**.\n> Send a new link or type "**cancel**" to cancel this partnership.`);
                        }

                        // Stop the link collector after checking the server
                        linkCollector.stop();
                    } catch (error) {
                        console.error('Error fetching invite:', error);
                        msg.reply('There was an error fetching your server invite. Please ensure the link is valid and try again.');
                    }
                });

                linkCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        message.reply('The time to respond has expired. Please start again by typing "**partner**".');
                    }
                });
            } else if (reaction.emoji.name === '❌') {
                // Cancel the process
                message.reply(
                    `# Partnership Canceled.\n> You decided to cancel the partnership.\n> If you want to start again, type "**partner**".`
                );
            }
        });

        reactionCollector.on('end', (collected, reason) => {
            if (reason === 'time') {
                message.reply('The time to respond has expired. Please start again by typing "**partner**".');
            }
        });
    }
});

// Login to Discord
login();
