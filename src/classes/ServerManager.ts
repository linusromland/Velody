// Internal dependencies
import Server from './Server';

export default class ServerManager {
	private servers: Server[] = [];

	public get(id: string): Server | undefined {
		return this.servers.find((server: Server) => server.id === id);
	}

	public add(server: Server): void {
		this.servers.push(server);
	}

	public remove(id: string): void {
		this.servers = this.servers.filter((server: Server) => server.id !== id);
	}
}
