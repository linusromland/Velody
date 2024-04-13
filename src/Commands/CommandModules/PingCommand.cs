using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody.Commands.CommandModules
{
    public class PingCommand(DiscordClient client, Counter counter) : ApplicationCommandModule
    {
        private readonly DiscordClient _client = client;
        private readonly Counter _counter = counter;

        [SlashCommand("ping", "Replies with pong!")]
        public async Task Ping(InteractionContext ctx)
        {
            _counter.Increment();
            await _client.UpdateStatusAsync(new DiscordActivity($"Playing pong. {_counter.GetCount()} times ran."));
            await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Pong!"));
        }
    }
}
