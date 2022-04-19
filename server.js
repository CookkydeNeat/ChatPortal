// Require the necessary discord.js classes
const { Client, Intents, WebhookClient } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const LinkFileName = './links.json';
// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('all servers linked together', { type: 'WATCHING' });
});
if (fs.existsSync(LinkFileName)) {
	console.log('file found');
}
else {
	console.log('file not found');
	fs.writeFile(LinkFileName, '', function(err) {
		if (err) throw err;
		console.log('File is created successfully.');
	});
}
function jsonReader(filePath, cb) {
	fs.readFile(filePath, (err, fileData) => {
		if (err) {
			return cb && cb(err);
		}
		if (fileData.length == 0) {
			return cb && cb(null, {
				waitingLink:{
					waitingServerID: '',
					since: 0,
					channelID: '',
				},
			});
		}
		try {
			const object = JSON.parse(fileData);
			return cb && cb(null, object);
		}
		catch (err) {
			return cb && cb(err);
		}
	});
}
function getWebhook(channelID) {
	const rawdata = fs.readFileSync(LinkFileName);
	if (rawdata.length == 0) return null;
	const data = JSON.parse(rawdata);
	if (data == null || data == undefined) return null;
	const webhookList = data.webhooks;
	if (webhookList == null || webhookList == undefined) return null;
	if (webhookList.length == 0) return null;
	for (const webhook of webhookList) {
		if (webhook.channelID == channelID) {
			return {
				id:webhook.id,
				token:webhook.token,
			};
		}
	}
	return null;
}
function createWebhook(channel) {
	if (channel == null) {
		console.error('channel is null!');
		return ;
	}
	channel.createWebhook('Linker', {
		avatar: 'https://www.colle.eu/media/13981/cat-926m-pdp-verhuur.jpg?width=550',
		reason: 'Needed a cool new Webhook',
	}).then(createdWebhook => {
		console.log(`Created webhook ${createdWebhook}`);
		jsonReader(LinkFileName, (err, links) => {
			if (err) {
				console.log('Error reading file:', err);
				return;
			}
			if (links == null) return;
			if (links.webhooks == null) {
				links.webhooks = [];
			}
			links.webhooks.push({
				channelID: channel.id,
				id:createdWebhook.id,
				token:createdWebhook.token,
			});
			fs.writeFile(LinkFileName, JSON.stringify(links, null, 4), err => {
				if (err) console.log('Error writing file:', err);
			});
		});
	}).catch(console.error);
}
function searchFreeLink() {
	const rawdata = fs.readFileSync(LinkFileName);
	if (rawdata.length == 0) return null;
	const data = JSON.parse(rawdata);
	if (data == null || data == undefined) return null;
	const waitingLink = data.waitingLink;
	if (waitingLink == null || waitingLink == undefined) return null;
	if (waitingLink.waitingServerID != '') {
		return waitingLink;
	}
	else {
		return null;
	}
}
function getlink(guildID) {
	const rawdata = fs.readFileSync(LinkFileName);
	if (rawdata.length == 0) return null;
	const data = JSON.parse(rawdata);
	if (data == null || data == undefined) return null;
	if (data.actives == undefined || data.actives == null) {
		return null;
	}
	for (const object of data.actives) {
		if (object.guild1.id == guildID || object.guild2.id == guildID) {
			return object;
		}
	}
	return false;
}
function checkLinks(guildID) {
	const rawdata = fs.readFileSync(LinkFileName);
	if (rawdata.length == 0) return null;
	const data = JSON.parse(rawdata);
	if (data == null || data == undefined) return null;
	if (data.actives == undefined || data.actives == null) {
		return null;
	}
	for (const object of data.actives) {
		if (object == null) continue;
		if (object.guild1.id == guildID || object.guild2.id == guildID) return true;
	}
	return null;
}

function setServerInWaitingLine(guildId, channelID) {
	console.log('set ' + guildId + ' in waiting line');
	jsonReader(LinkFileName, (err, links) => {
		if (err) {
			console.log('Error reading file:', err);
			return;
		}
		links.waitingLink.waitingServerID = guildId;
		links.waitingLink.since = Date.now();
		links.waitingLink.channelID = channelID;
		fs.writeFile(LinkFileName, JSON.stringify(links, null, 4), err => {
			if (err) console.log('Error writing file:', err);
		});
	});
}
function removeConnection(guildID) {
	console.log('deconnecting ' + guildID);
	fs.readFile(LinkFileName, 'utf8', async function readFileCallback(err, data) {
		if (err) {
			console.log(err);
		}
		else {
			const obj = JSON.parse(data);
			if (obj.actives == undefined || obj.actives == null) {
				obj.actives = [];
			}
			for (let i = 0; i < obj.actives.length; i++) {
				const object = obj.actives[i];
				if (object.guild1.id == guildID || object.guild2.id == guildID) {
					obj.actives.splice(i, 1);
				}
				const guild1 = await client.guilds.fetch(object.guild1.id);
				if (guild1 == null) {
					console.error('Guild1 is not found! (guild id: ' + object.guild1.id + ')');
					return;
				}
				const channel1 = await guild1.channels.fetch(object.guild1.channelID);
				if (channel1 == null) {
					console.error('Guild1 channel is not found! (channel id: ' + object.guild1.channelID + ')');
					return;
				}
				channel1.send('Link closed');

				const guild2 = await client.guilds.fetch(object.guild2.id);
				if (guild2 == null) {
					console.error('Guild2 is not found! (guild id: ' + object.guild2.id + ')');
					return;
				}
				const channel2 = await guild2.channels.fetch(object.guild2.channelID);
				if (channel2 == null) {
					console.error('Guild2 channel is not found! (channel id: ' + object.guild2.ChannelID + ')');
					return;
				}
				channel2.send('Link closed');

			}
			const json = JSON.stringify(obj, null, '\t');
			fs.writeFile(LinkFileName, json, function writeFileCallback(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	});
}
async function setConnection(guildId1, channelID1, guildId2, channelID2, duration) {
	console.log('connecting ' + guildId1 + ' with ' + guildId2);
	fs.readFile(LinkFileName, 'utf8', function readFileCallback(err, data) {
		if (err) {
			console.log(err);
		}
		else {
			const obj = JSON.parse(data);
			if (obj.actives == undefined || obj.actives == null) {
				obj.actives = [];
			}
			obj.waitingLink.waitingServerID = '';
			obj.waitingLink.since = '';
			obj.waitingLink.channelID = '';
			obj.actives.push({
				'guild1': {
					id : guildId1,
					channelID: channelID1,
				},
				'guild2':{
					id : guildId2,
					channelID: channelID2,
				},
			});
			const json = JSON.stringify(obj, null, '\t');
			fs.writeFile(LinkFileName, json, function writeFileCallback(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	});
	const guild1 = await client.guilds.fetch(guildId1);
	if (guild1 == null) {
		console.error('Guild1 is not found! (guild id: ' + guildId1 + ')');
		return;
	}
	const channel1 = await guild1.channels.fetch(channelID1);
	if (channel1 == null) {
		console.error('Guild1 channel is not found! (channel id: ' + channelID1 + ')');
		return;
	}
	channel1.send('Server found, establishing connection...');
	channel1.send('Connexion done! (research duration: ' + duration + 'min)');
	if (getWebhook(channel1.id) == null) {
		createWebhook(channel1);
	}
	const guild2 = await client.guilds.fetch(guildId2);
	if (guild2 == null) {
		console.error('Guild2 is not found! (guild id: ' + guildId2 + ')');
		return;
	}
	const channel2 = await guild2.channels.fetch(channelID2);
	if (channel2 == null) {
		console.error('Guild2 channel is not found! (channel id: ' + channelID2 + ')');
		return;
	}
	channel2.send('Connexion done!');
	console.log(`Connection done between ${guild1.name} (${channel1.name}) and ${guild2.name} (${channel2.name}) `);
	if (getWebhook(channel2.id) == null) {
		createWebhook(channel2);
	}
	const inviteGuild1 = await guild1.invites.create(channel1.id, { temporary:true, maxAge:86400 });
	channel2.send('Welcome to ' + guild1.name + '!\nHere is the invite if you want to join the server: ' + inviteGuild1.url);
	const inviteGuild2 = await guild2.invites.create(channel2.id, { temporary:true, maxAge:86400 });
	channel1.send('Welcome to ' + guild2.name + '!\nHere is the invite if you want to join the server: ' + inviteGuild2.url);
	// 24h timeout, maybe better solution but idk for the moment
	setTimeout(() => {
		removeConnection(guild1.id);
	}, 1000 * 60 * 60 * 24);
}


client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	}
	else if (commandName === 'link') {
		await interaction.reply('Searching for a server...');
		const freelink = searchFreeLink();
		if (checkLinks(interaction.guildId)) {
			interaction.channel.send('you are already linked with another server!');
			return;
		}
		if (freelink == null) {
			setServerInWaitingLine(interaction.guildId, interaction.channelId);
		}
		else {
			const serverID = freelink.waitingServerID;
			if (serverID == null) {
				setServerInWaitingLine(interaction.guildId, interaction.channelId);
			}
			else if (serverID == interaction.guildId) {
				interaction.channel.send('You are already waiting for link connection!');
			}
			else {
				interaction.channel.send('Server found, establishing connection...');
				let diff = Date.now() - freelink.since;
				diff = Math.round(diff / 1000);
				diff = Math.round(diff / 60);
				setConnection(serverID, freelink.channelID, interaction.guildId, interaction.channelId, diff);
			}
		}
	}
	else if (commandName == 'unlink') {
		if (!checkLinks(interaction.guildId)) {
			interaction.reply('you are not linked!');
			return;
		}
		interaction.reply('Disconecting...');
		removeConnection(interaction.guildId);

	}
});

client.on('messageCreate', async (message) => {
	if (message.author.bot || message.webhookId) return;
	if (!checkLinks(message.guildId)) return;
	const object = getlink(message.guildId);
	if (object.guild1.id == message.guildId) {
		const guild2 = await client.guilds.fetch(object.guild2.id);
		if (guild2 == null) {
			console.error('guild is null!');
			return;
		}
		const targetChannel = await guild2.channels.fetch(object.guild2.channelID);
		if (targetChannel == null) {
			console.error('channel is null!');
			return;
		}
		const webhookCredential = getWebhook(targetChannel.id);
		if (webhookCredential == null) {
			console.error('webhook is null!');
			return null;
		}
		const webhookClient = new WebhookClient({ id: webhookCredential.id, token: webhookCredential.token });
		webhookClient.send({
			content:message.content,
			avatarURL: message.author.displayAvatarURL(),
			username: message.author.username,
		});

	}
	else {
		const guild1 = await client.guilds.fetch(object.guild1.id);
		if (guild1 == null) {
			console.error('guild is null!');
			return;
		}
		const targetChannel = await guild1.channels.fetch(object.guild1.channelID);
		if (targetChannel == null) {
			console.error('channel is null!');
			return;
		}
		const webhookCredential = getWebhook(targetChannel.id);
		if (webhookCredential == null) {
			console.error('webhook is null!');
			return null;
		}
		const webhookClient = new WebhookClient({ id: webhookCredential.id, token: webhookCredential.token });
		webhookClient.send({
			content:message.content,
			avatarURL: message.author.displayAvatarURL(),
			username: message.author.username,
		});
	}
});
// Login to Discord with your client's token
client.login(token);