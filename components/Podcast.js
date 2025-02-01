"use client";
import React, { useState, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const Podcast = () => {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("viewer");
  const [token, setToken] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [client, setClient] = useState(null);

  const channelName = "SANATANVISION";
  const title = "MYLIVE";

  const fetchToken = async () => {
    const eventTime = new Date().toISOString();
    try {
      const response = await fetch("http://localhost:3001/api/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          uid,
          role,
          title,
          username: "john_doe",
          eventTime,
        }),
      });

      if (response.ok) {
        const { token } = await response.json();
        setToken(token);
      } else {
        const { error } = await response.json();
        alert(error || "Failed to generate token");
      }
    } catch (error) {
      console.error("Error fetching token:", error);
      alert("Failed to fetch token");
    }
  };

  const joinChannel = async () => {
    if (!token || !uid) {
      alert("Please enter a UID and fetch a token first.");
      return;
    }

    const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8", role: role });
    setClient(agoraClient);

    try {
      await agoraClient.join(process.env.NEXT_PUBLIC_AGORA_APP_ID, channelName, token, uid);
      setIsJoined(true);

      if (role === "host") {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await agoraClient.publish([videoTrack, audioTrack]);
        console.log("Host stream published successfully");
        setLocalStream(videoTrack);
        videoTrack.play("local-video");
        
        // If there are any remote streams at the time the host joins, subscribe to them as well
        agoraClient.on("stream-added", (event) => {
          const remoteStream = event.stream;
          console.log("Stream added:", remoteStream);
          agoraClient.subscribe(remoteStream);
        });

        agoraClient.on("stream-subscribed", (event) => {
          const remoteStream = event.stream;
          console.log("Stream subscribed:", remoteStream);
          setRemoteStreams((prev) => [...prev, remoteStream]);
          remoteStream.play(`remote-video-${remoteStream.getId()}`);
        });
      }

      if (role === "viewer") {
        // If the viewer joins after the host has published their stream
        agoraClient.on("stream-added", (event) => {
          const remoteStream = event.stream;
          console.log("Stream added:", remoteStream);
          if (remoteStream.getId() === localStream?.getId()) {
            // If it's the host's stream, subscribe to it
            console.log("Viewer subscribing to host's stream");
            agoraClient.subscribe(remoteStream);
          }
        });
      }

      agoraClient.on("stream-subscribed", (event) => {
        const remoteStream = event.stream;
        console.log("Stream subscribed:", remoteStream);
        setRemoteStreams((prev) => [...prev, remoteStream]);
        remoteStream.play(`remote-video-${remoteStream.getId()}`);
      });

      agoraClient.on("stream-removed", (event) => {
        const removedStream = event.stream;
        setRemoteStreams((prev) => prev.filter((stream) => stream.getId() !== removedStream.getId()));
        console.log("Stream removed:", removedStream);
      });
    } catch (error) {
      console.error("Error joining channel:", error);
      alert("Failed to join channel");
    }
  };


  const leaveChannel = async () => {
    if (client) {
      if (localStream) {
        localStream.stop();
        localStream.close();
        setLocalStream(null);
      }

      remoteStreams.forEach((stream) => {
        stream.stop();
        stream.close();
      });
      setRemoteStreams([]);

      await client.leave();
      setIsJoined(false);
      setClient(null);
    }
  };

  useEffect(() => {
    return () => {
      if (client) {
        leaveChannel();
      }
    };
  }, [client]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-[700px] h-[800px] p-6 bg-white shadow-lg rounded-lg border border-gray-200">
        {/* Input Fields */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="User ID"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="host">Host</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* Display Hardcoded Channel Name and Title */}
        <div className="mb-6">
          <p className="font-semibold text-lg">Channel: {channelName}</p>
          <p className="font-semibold text-lg">Title: {title}</p>
        </div>

        {/* Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={fetchToken}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Get Token
          </button>
          <button
            onClick={joinChannel}
            disabled={!token || isJoined}
            className={`w-full py-3 ${!token || isJoined ? "bg-gray-400" : "bg-green-500"} text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500`}
          >
            Join Channel
          </button>
          <button
            onClick={leaveChannel}
            disabled={!isJoined}
            className={`w-full py-3 ${!isJoined ? "bg-gray-400" : "bg-red-500"} text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500`}
          >
            Leave Channel
          </button>
        </div>

        {/* Video Streams */}
        <div className="flex space-x-4">
          {/* Local Video */}
          {role === "host" && (
            <div id="local-video" className="w-64 h-48 border-2 border-gray-300 rounded-lg"></div>
          )}

          {/* Remote Videos */}
          {remoteStreams.map((stream) => (
            <div
              key={stream.getId()}
              id={`remote-video-${stream.getId()}`}
              className="w-64 h-48 border-2 border-gray-300 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Podcast;
