"use client"; // Required for using React hooks and browser APIs in Next.js
import React, { useState, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk";

const Stream = () => {
  const [token, setToken] = useState("");
  const [channelName, setChannelName] = useState("");
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("viewer"); // Default role is viewer
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null); // Store local stream
  const [remoteStreams, setRemoteStreams] = useState([]); // Store remote streams
  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

  // Fetch token from backend
  const fetchToken = async () => {
    try {
      const response = await fetch("http://localhost:3000/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, uid, role }), // Send role to backend
      });
      const { token } = await response.json();
      setToken(token);
    } catch (error) {
      console.error("Failed to fetch token:", error);
    }
  };

  // Join Agora channel
  const joinChannel = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: "live", codec: "h264" });

      // Join the channel
      await client.join(APP_ID, channelName, token, uid);
      setIsJoined(true);

      if (role === "host") {
        // Host: Create and publish local stream
        const stream = AgoraRTC.createStream({ audio: true, video: true });
        await stream.init();
        client.publish(stream);
        setLocalStream(stream);

        // Display local video
        stream.play("local-video");
      }

      // Handle remote streams
      client.on("stream-added", (event) => {
        const remoteStream = event.stream;
        client.subscribe(remoteStream);
      });

      client.on("stream-subscribed", (event) => {
        const remoteStream = event.stream;
        setRemoteStreams((prev) => [...prev, remoteStream]);
        remoteStream.play(`remote-video-${remoteStream.getId()}`);
      });

      // Handle stream removal
      client.on("stream-removed", (event) => {
        const remoteStream = event.stream;
        setRemoteStreams((prev) =>
          prev.filter((stream) => stream.getId() !== remoteStream.getId())
        );
      });
    } catch (error) {
      console.error("Failed to join channel:", error);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.close(); // Stop local stream
      }
      remoteStreams.forEach((stream) => stream.close()); // Stop all remote streams
    };
  }, [localStream, remoteStreams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Agora Live Streaming</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Channel Name"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          className="p-2 border rounded-md text-lg"
        />
        <input
          type="text"
          placeholder="User ID"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          className="p-2 border rounded-md text-lg"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="p-2 border rounded-md text-lg"
        >
          <option value="host">Host</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          onClick={fetchToken}
          className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Get Token
        </button>
        <button
          onClick={joinChannel}
          disabled={!token || isJoined}
          className={`p-2 ${
            !token || isJoined
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white rounded-md`}
        >
          Join Channel
        </button>
      </div>

      {/* Video Streams */}
      <div className="mt-6 w-full max-w-xl">
        {/* Local video (if host) */}
        {role === "host" && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Your Stream</h2>
            <div id="local-video" className="w-full h-80 bg-black rounded-lg"></div>
          </div>
        )}

        {/* Remote videos */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Remote Streams</h2>
          {remoteStreams.map((stream) => (
            <div
              key={stream.getId()}
              id={`remote-video-${stream.getId()}`}
              className="w-full h-80 bg-black rounded-lg mb-4"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stream;