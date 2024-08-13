using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Velody.InteractionHandlers;

namespace Velody
{
	public class EmbedBuilder
	{
		private readonly DiscordEmbedBuilder _builder = new DiscordEmbedBuilder();
		private readonly InteractionContext? _ctx;

		private readonly DiscordMessage? _message;

		private List<DiscordActionRowComponent> _actionRows = [];

		public EmbedBuilder(InteractionContext ctx)
		{
			Init();
			_ctx = ctx;
			_ctx.CreateResponseAsync(InteractionResponseType.DeferredChannelMessageWithSource);
		}

		public EmbedBuilder(DiscordMessage message)
		{
			Init();
			_message = message;
		}

		private void Init()
		{
			_builder.WithAuthor("Velody", "https://github.com/linusromland/Velody", "https://raw.githubusercontent.com/linusromland/Velody/master/assets/logo.jpeg");
			_builder.WithColor(DiscordColor.CornflowerBlue);
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

		public EmbedBuilder WithURL(string url)
		{
			_builder.Url = url;
			return this;
		}

		public EmbedBuilder WithActionButton(string label, string actionType, JObject data, bool isDisabled = false)
		{

			string value = InteractionHandler.StringifyData(actionType, data);
			DiscordButtonComponent button = new(ButtonStyle.Primary, value, label, isDisabled);

			if (_actionRows.Count == 0 || _actionRows.Last().Components.Count == 5)
			{
				DiscordActionRowComponent actionRow = new([button]);
				_actionRows.Add(actionRow);
			}
			else
			{
				List<DiscordComponent> components = _actionRows.Last().Components.ToList();
				components.Add(button);

				DiscordActionRowComponent actionRow = new(components);
				_actionRows[_actionRows.Count - 1] = actionRow;
			}

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
			if (_ctx != null)
			{
				DiscordWebhookBuilder messageBuilder = new();
				messageBuilder.AddEmbed(_builder);

				if (_actionRows.Count > 0)
				{
					messageBuilder.AddComponents(_actionRows);
				}

				await _ctx.EditResponseAsync(messageBuilder);
				return;
			}
			else if (_message != null)
			{
				DiscordMessageBuilder messageBuilder = new();
				messageBuilder.AddEmbed(_builder);

				if (_actionRows.Count > 0)
				{
					messageBuilder.AddComponents(_actionRows);
				}

				await _message.ModifyAsync(messageBuilder);
			}
			return;

		}
	}
}