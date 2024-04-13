using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody.Commands.CommandModules
{
    public class PingCommand(DiscordClient client) : ApplicationCommandModule
    {
        private readonly DiscordClient _client = client;
        private int _pingCount = 0;

        [SlashCommand("ping", "Replies with pong!")]
        public async Task Ping(InteractionContext ctx)
        {
            _pingCount++;
            await _client.UpdateStatusAsync(new DiscordActivity($"Playing pong. {_pingCount} times ran."));
            await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Pong!"));
        }
    }
}
