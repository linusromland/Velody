using DSharpPlus;
using DSharpPlus.Entities;
using DSharpPlus.SlashCommands;

namespace Velody.Commands.CommandModules
{
    public class PingCommand : ApplicationCommandModule
    {
        [SlashCommand("ping", "Replies with pong!")]
        public static async Task Ping(InteractionContext ctx)
        {
            await ctx.CreateResponseAsync(InteractionResponseType.ChannelMessageWithSource, new DiscordInteractionResponseBuilder().WithContent("Pong!"));
        }
    }
}
