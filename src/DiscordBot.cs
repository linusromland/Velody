using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.EventArgs;
using DSharpPlus.SlashCommands;
using DSharpPlus.VoiceNext;

namespace Velody
{
	class DiscordBot
	{
		public static DiscordClient? discordClient { get; private set; }

		public DiscordBot(Config.AppSettings appSettings)
		{
			discordClient = new DiscordClient(new DiscordConfiguration()
			{
				Token = appSettings.DiscordSettings.Token,
				TokenType = TokenType.Bot,
				Intents = DiscordIntents.AllUnprivileged | DiscordIntents.MessageContents
			});

			SlashCommandsExtension slashCommands = discordClient.UseSlashCommands();
			slashCommands.RegisterCommands<SlashCommands>(appSettings.DiscordSettings.GuildID);
			discordClient.ComponentInteractionCreated += InteractionHandler.HandleInteraction;
			discordClient.UseVoiceNext();

			discordClient.Ready += (client, args) =>
			{
				Console.WriteLine($"Connected to Discord as {client.CurrentUser.Username}#{client.CurrentUser.Discriminator}");
				return Task.CompletedTask;
			};

			discordClient.ConnectAsync(new DiscordActivity("with sounds", ActivityType.Playing));
		}


	}
}