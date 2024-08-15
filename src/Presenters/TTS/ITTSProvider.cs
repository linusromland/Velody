namespace Velody.Presenters.TTS
{
    public interface ITTSProvider
    {
        string ServiceName { get; }
        Task SpeakAsync(string text);
    }
}