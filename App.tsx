// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Open up App.tsx to start working on your app!</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });


import { TextInput, Button, TouchableOpacity, Alert, NativeEventEmitter, NativeModules } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { encode } from "base64-arraybuffer";
import React, { useEffect } from "react";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { View, Text } from "react-native";
import { useState } from "react";

const Home = () => {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
  const [link, setLink] = useState("");

  useEffect(() => {
    if (hasShareIntent) {
      console.log("Received share intent:", shareIntent?.text);
      setLink(shareIntent?.text ?? "");
      // resetShareIntent();
    }
  }, [hasShareIntent]);

  const pasteFromClipboard = async () => {
    const clipboardContent = await Clipboard.getStringAsync();
    setLink(clipboardContent);
  };

  const fetchVideo = async () => {
    if (!link) {
      Alert.alert("Error", "Please enter a valid link.");
      return;
    }
      try {
        const res = await fetch("http://10.46.77.173:10000/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: link }),
        });
  
        if (!res.ok) {
            throw new Error("Failed to fetch video");
        }
  
        const contentDisposition = res.headers.get("content-disposition");
        let filename = "video.mp4";
  
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";]+)"?/);
            if (match) filename = match[1];
        }
  
        filename = filename.replace(/\s+/g, "_");
        const fileUri = FileSystem.documentDirectory + filename;
  
        // Convert response to base64
        const arrayBuffer = await res.arrayBuffer();
        const base64 = encode(arrayBuffer);
  
        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
  
        // Request Media Library Permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
            throw new Error("Permission to access media library is required.");
        }
  
        // Save video to gallery
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Download", asset, false);
  
        Alert.alert("Download Complete", "Video saved to gallery!");
  
        // if (await Sharing.isAvailableAsync()) {
        //     await Sharing.shareAsync(fileUri);
        // }
  
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "An unknown error occurred");
      }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Enter Video Link:</Text>
      <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, padding: 10, borderRadius: 5 }}
          value={link}
          onChangeText={setLink}
          placeholder="Paste the link here"
        />
        <TouchableOpacity onPress={pasteFromClipboard} style={{ marginLeft: 10, padding: 10, backgroundColor: "#ccc", borderRadius: 5 }}>
          <Text>Paste</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 10 }}>
        <Button title="Download" onPress={fetchVideo} />
      </View>
    </View>
  );
};

export default function App() {
  return (
    <ShareIntentProvider>
      <Home />
    </ShareIntentProvider>
  );
}
