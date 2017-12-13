const helper = require('../utils/helper');
const enumHelper = require('../utils/enumHelper');
const Database = require('../database/Database');
const Event = require('./utils/Event');
const moment = require('moment');
const logger = require('../utils/logger');

class Game {

  selectEvent(player, onlinePlayers, discordHook, twitchBot) {
    const randomEvent = helper.randomInt(0, 2);

    Database.loadPlayer(player.discordId)
      .then((selectedPlayer) => {
        if (!selectedPlayer) {
          return Database.createNewPlayer(player.discordId, player.name);
        }

        return selectedPlayer;
      })
      .then((selectedPlayer) => {
        selectedPlayer.events++;
        helper.passiveHeal(selectedPlayer);
        console.log(`\nGAME: Random Event ID: ${randomEvent} ${moment().utc('br')}`);

        switch (randomEvent) {
          case 0:
            console.log(`GAME: ${selectedPlayer.name} activated a move event.`);
            this.moveEvent(selectedPlayer)
              .then(updatedPlayer => Database.savePlayer(updatedPlayer));
            break;
          case 1:
            console.log(`GAME: ${selectedPlayer.name} activated an attack event.`);
            this.attackEvent(selectedPlayer, onlinePlayers, discordHook, twitchBot)
              .then(updatedPlayer => Database.savePlayer(updatedPlayer));
            break;
          case 2:
            console.log(`GAME: ${selectedPlayer.name} activated a luck event.`);
            this.luckEvent(selectedPlayer, discordHook, twitchBot)
              .then(updatedPlayer => Database.savePlayer(updatedPlayer));
            break;
        }

        if (selectedPlayer.events % 100 === 0) {
          helper.sendMessage(discordHook, twitchBot, helper.setImportantMessage(`${selectedPlayer.name} has encountered ${selectedPlayer.events} events!`));
        }
      })
      .catch(err => logger.error(err));
  }

  moveEvent(selectedPlayer) {
    return Event.moveEvent(selectedPlayer);
  }

  attackEvent(selectedPlayer, onlinePlayers, discordHook, twitchBot) {
    const luckDice = helper.randomInt(0, 100);
    if (selectedPlayer.map.type === enumHelper.map.types.town && luckDice <= 15 + (selectedPlayer.stats.luk / 2)) {
      return Event.generateTownItemEvent(discordHook, twitchBot, selectedPlayer);
    }

    console.log(`GAME: Attack Luck Dice: ${luckDice}`);

    if (luckDice >= 50 - (selectedPlayer.stats.luk / 2) && selectedPlayer.map.type !== enumHelper.map.types.town) {
      const updatedPlayer = Event.attackEventPlayerVsPlayer(discordHook, twitchBot, selectedPlayer, onlinePlayers);
      if (updatedPlayer !== selectedPlayer) {
        return updatedPlayer;
      }
    }

    return Event.attackEventMob(discordHook, twitchBot, selectedPlayer);
  }

  luckEvent(selectedPlayer, discordHook, twitchBot) {
    const luckDice = helper.randomInt(0, 100);
    if (luckDice <= 5 + (selectedPlayer.stats.luk / 2)) {
      return Event.generateGodsEvent(discordHook, twitchBot, selectedPlayer);
    } else if (luckDice >= 65 - (selectedPlayer.stats.luk / 2)) {
      return Event.generateLuckItemEvent(discordHook, twitchBot, selectedPlayer);
    }

    return Event.generateGoldEvent(selectedPlayer);
  }

  // Commands
  playerStats(commandAuthor) {
    return Database.loadPlayer(commandAuthor.id);
  }

  forcePvp(discordBot, discordHook, commandAuthor, playerToAttack, otherPlayerToAttack) {
    if (!otherPlayerToAttack) {
      return Database.loadPlayer(commandAuthor.id)
        .then((selectedPlayer) => {
          const playerToAttackObj = discordBot.users.filter(player => player.username === playerToAttack && !player.bot);
          if (playerToAttackObj.size === 0) {
            commandAuthor.send(`${playerToAttack} was not found!`);
            return;
          }

          this.playerStats(playerToAttackObj.array()[0])
            .then((playerToAttackStats) => {
              if (!playerToAttackStats) {
                return commandAuthor.send('This players stats were not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
              }

              const updatedPlayer = Event.attackForcePvPAttack(discordHook, 'twitchBot', selectedPlayer, playerToAttackStats);
              Database.savePlayer(updatedPlayer);
            });
        });
    }
    const playerToAttackObj = discordBot.users.filter(player => player.username === playerToAttack && !player.bot);
    const otherPlayerToAttackObj = discordBot.users.filter(player => player.username === otherPlayerToAttack && !player.bot);

    return this.playerStats(playerToAttackObj.array()[0])
      .then((playerToAttackStats) => {
        if (!playerToAttackStats) {
          return commandAuthor.send('This players stats were not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
        }

        this.playerStats(otherPlayerToAttackObj.array()[0])
          .then((otherPlayerToAttackStats) => {
            if (!otherPlayerToAttackStats) {
              return commandAuthor.send('This players stats were not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            const updatedPlayer = Event.attackForcePvPAttack(discordHook, 'twitchBot', playerToAttackStats, otherPlayerToAttackStats);
            Database.savePlayer(updatedPlayer);
          });
      });
  }

  getOnlinePlayerMaps(onlinePlayers) {
    return Database.loadOnlinePlayerMaps(onlinePlayers);
  }

  deleteAllPlayers() {
    return Database.deleteAllPlayers();
  }

}
module.exports = new Game();
