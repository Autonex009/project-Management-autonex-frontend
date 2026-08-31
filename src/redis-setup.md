# Local Redis Setup Guide for Windows

This guide outlines the exact steps to get Redis running locally on your Windows machine using Docker and RedisInsight. We will use this to power the background job queues for the Encord Sync feature.

## 1. Install Docker Desktop
Docker is the industry standard for running backend services locally without cluttering your operating system.

1. Download **Docker Desktop for Windows**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Run the installer and accept the default settings (ensure WSL2 is checked if prompted).
3. **Restart your computer** if the installer asks you to.
4. After restarting, open the **Docker Desktop** app from your Start Menu.
5. Wait for the engine to start (you will see a green icon or "Engine running" in the bottom left).

## 2. Start the Redis Server
Once Docker is running, you can spin up a Redis server in seconds.

1. Open **PowerShell** or **Command Prompt**.
2. Run the following command:
   ```bash
   docker run -d --name local-redis -p 6379:6379 redis:latest
   ```
   **What this does:**
   * `-d`: Runs the server silently in the background.
   * `--name local-redis`: Names the container so you can find it easily.
   * `-p 6379:6379`: Exposes the default Redis port to your Windows machine so our FastAPI backend can connect to it.

> [!TIP]
> **Managing Redis:** 
> In the future, you can stop or start the Redis server simply by opening the Docker Desktop app, going to the **Containers** tab, and clicking the Play or Stop button next to `local-redis`.

## 3. Install RedisInsight (The GUI)
RedisInsight is the official tool to visually inspect the data and background jobs sitting inside your Redis queue.

1. Download **RedisInsight**: [redis.com/redis-enterprise/redis-insight](https://redis.com/redis-enterprise/redis-insight/)
2. Run the installer.
3. Open RedisInsight and click **Add Redis Database**.
4. Fill in the connection details:
   * **Host:** `127.0.0.1` (or `localhost`)
   * **Port:** `6379`
   * Leave the username and password blank.
5. Click **Add Database**.

You will now be able to click into the database and view all active keys, job queues, and cached data!

---

> [!IMPORTANT]
> Once you have completed these steps, let me know! We will then begin installing the `arq` Python packages and writing the backend code for the Encord Sync feature.
