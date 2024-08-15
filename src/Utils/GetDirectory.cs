using Microsoft.Extensions.Logging;
using Serilog;

namespace Velody.Utils
{
    internal class GetDirectory
    {
        public static string GetCachePath(string path)
        {
            string fullPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "cache", path);
            CreateDirectoryIfNotExists(fullPath);
            Console.WriteLine(fullPath);
            return fullPath;
        }

        public static void CreateDirectoryIfNotExists(string path)
        {
            if (!System.IO.Directory.Exists(path))
            {
                System.IO.Directory.CreateDirectory(path);
            }
        }


    }
}
