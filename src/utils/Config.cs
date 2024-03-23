using System.Text;
using Microsoft.Extensions.Configuration;

namespace Velody
{
	class Config
	{
		public class DiscordSettings
		{
			public string Token { get; }
			public ulong? GuildID { get; }

			public DiscordSettings(string token, ulong? guildID)
			{
				Token = token;
				GuildID = guildID;
			}
		}

		public class AppSettings
		{
			public DiscordSettings DiscordSettings { get; }

			public AppSettings(DiscordSettings discordSettings)
			{
				DiscordSettings = discordSettings;
			}
		}


		public static AppSettings GetConfigSettings()
		{
			string basePath = Directory.GetCurrentDirectory();

			IConfiguration config = new ConfigurationBuilder()
				.SetBasePath(basePath)
				.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
				.Build();

			string? discordToken = config["Discord:Token"];
			string? discordGuildID = config["Discord:GuildID"];

			if (discordToken == null)
			{
				discordToken = Environment.GetEnvironmentVariable("DISCORD_TOKEN");
			}

			if (discordToken == null)
			{

				throw new Exception("Discord token not found in config.json or DISCORD_TOKEN environment variable");
			}

			if (discordGuildID != null && !ulong.TryParse(discordGuildID, out ulong _))
			{
				throw new Exception("Invalid guild ID");
			}

			ulong? guildIdAsUlong = discordGuildID == null ? null : ulong.Parse(discordGuildID);

			DiscordSettings discordSettings = new DiscordSettings(discordToken, guildIdAsUlong);

			return new AppSettings(discordSettings);
		}
	}
}