namespace Velody.Presenters.TTS
{
    public class GoogleTTS : ITTSProvider
    {
        public string ServiceName => "GoogleTTS";
        public Task SpeakAsync(string text)
        {
            // TODO: Implement Google TTS.
            Console.WriteLine($"GoogleTTS: {text}");
            return Task.CompletedTask;
        }
    }
}