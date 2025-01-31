"use client"
import React, { useState } from 'react'
import { useEffect } from 'react'
import AgoraRTC from 'agora-rtc-sdk' 

const Stream = () => {
    const [token, setToken] = useState("");
    const [channelName, setChannelName] = useState("");
    const [uid, setUid] = useState("");
    const [role, setRole] = useState("host"); 
    const [isJoined, setIsJoined] = useState(false);
    const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

    // Fetch token from backend
    const fetchToken = async () => {
        const response = await fetch("http://localhost:3000/generate-token", {
    method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ channelName, uid, role }), // Include the role here
    });
    const { token } = await response.json();
     setToken(token);
    };

    // Join Agora channel
    const joinChannel = async () => {
     const client = AgoraRTC.createClient({ mode: "live", codec: "h264" });

     try {
   await client.join(APP_ID, channelName, token, uid);
setIsJoined(true);

 const localStream = AgoraRTC.createStream({ audio: true, video: true });
 await localStream.init();
client.publish(localStream);

            // Handle remote streams
 client.on("stream-added", (event) => {
const remoteStream = event.stream;
     client.subscribe(remoteStream);
   });

 client.on("stream-subscribed", (event) => {
      const remoteStream = event.stream;
       remoteStream.play("remote-video");
   });
   } catch (error) {
     console.error("Error joining the channel: ", error);
      }
    };

    return (
 <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
 <h1 className="text-3xl font-bold mb-6">Agora Live Streaming</h1>
      <div className="flex flex-col gap-4">
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
                    <option value="subscriber">Subscriber</option>
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
                    className={`p-2 ${!token || isJoined ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
                >
                    Join Channel
                </button>
            </div>
            <div id="remote-video" className="mt-6 w-full max-w-xl h-80 bg-black"></div>
        </div>
    )
}

export default Stream;
