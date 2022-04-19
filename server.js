// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const LinkFileName = './links.json';
// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});
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
				'guildId2':{
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
}


client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	}
	else if (commandName === 'link') {
		await interaction.reply('Searching for a server...');
		// eslint-disable-next-line prefer-const
		const freelink = searchFreeLink();
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
});
// Login to Discord with your client's token
client.login(token);