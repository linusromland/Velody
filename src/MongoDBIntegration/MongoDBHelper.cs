using MongoDB.Driver;

namespace Velody.MongoDBIntegration
{
	public class MongoDBHelper
	{
		private IMongoDatabase _database;

		public MongoDBHelper(string connectionString, string databaseName)
		{
			var client = new MongoClient(connectionString);
			_database = client.GetDatabase(databaseName);
		}

		public IMongoCollection<T> GetCollection<T>(string collectionName)
		{
			return _database.GetCollection<T>(collectionName);
		}

	}
}
