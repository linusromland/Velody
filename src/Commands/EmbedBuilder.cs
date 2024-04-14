using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody
{
	internal class EmbedBuilder
	{
		private readonly DiscordEmbedBuilder _builder = new DiscordEmbedBuilder();

		private readonly InteractionContext _ctx;

		public EmbedBuilder(InteractionContext ctx)
		{
			_builder.WithAuthor("Velody", "https://github.com/linusromland/Velody", "https://raw.githubusercontent.com/linusromland/Velody/master/assets/logo.jpeg");
			_builder.WithColor(DiscordColor.CornflowerBlue);
			_ctx = ctx;
			_ctx.CreateResponseAsync(InteractionResponseType.DeferredChannelMessageWithSource);
		}

		public EmbedBuilder WithTitle(string title)
		{
			_builder.Title = title;
			return this;
		}

		public EmbedBuilder WithDescription(string description)
		{
			_builder.Description = description;
			return this;
		}

		public EmbedBuilder WithImage(string url)
		{
			_builder.ImageUrl = url;
			return this;
		}
		public async Task SendUnkownErrorAsync()
		{
			_builder.WithTitle("Error");
			_builder.WithDescription("An unknown error occurred.");
			await Send();
			return;
		}

		public async Task Send()
		{
			await _ctx.EditResponseAsync(new DiscordWebhookBuilder().AddEmbed(_builder));
			return;
		}
	}
}