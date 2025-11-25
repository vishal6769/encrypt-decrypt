// enc.cpp
#include <fstream>
#include <vector>
#include <cstdint>
#include <iostream>
#include <string>
#include <algorithm>
#include <cstdio>

#include "des.cpp"           // your DES implementation (as provided)
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

std::string pickFile() {
    std::string tempFile = "/tmp/filedialog_result.txt";

    std::string command =
        "osascript -e 'set theFile to choose file' "
        "-e 'do shell script \"echo \" & quoted form of POSIX path of theFile & \" > " + tempFile + "\"'";

    int rc = system(command.c_str());
    if (rc != 0) {
        return "";
    }

    FILE* fp = fopen(tempFile.c_str(), "r");
    if (!fp) return "";

    char buffer[4096];
    if (!fgets(buffer, sizeof(buffer), fp)) {
        fclose(fp);
        return "";
    }
    fclose(fp);

    std::string path(buffer);
    // remove trailing newline if present
    if (!path.empty() && (path.back() == '\n' || path.back() == '\r')) path.pop_back();
    return path;
}

int main() {
    std::string file = pickFile();
    if (file.empty()) {
        std::cerr << "No file chosen or picker failed.\n";
        return 1;
    }

    // load image
    int width = 0, height = 0, channels_in_file = 0;
    // Requested 3 channels (RGB)
    unsigned char* data = stbi_load(file.c_str(), &width, &height, &channels_in_file, 3);
    if (!data) {
        std::cerr << "Failed to load image: " << file << '\n';
        return 1;
    }
    const int channels = 3;
    const size_t size = static_cast<size_t>(width) * static_cast<size_t>(height) * channels;
    std::cout << "Loaded: " << file << " (" << width << "x" << height << "), channels=" << channels << ", bytes=" << size << "\n";

    // Read key
    std::string keyStr;
    std::cout << "Enter encryption key (exactly 8 chars; will be padded/truncated): ";
    std::cin >> keyStr;
    if (keyStr.size() < 8) {
        keyStr.append(8 - keyStr.size(), '0');
    } else if (keyStr.size() > 8) {
        keyStr = keyStr.substr(0, 8);
    }

    // Convert image bytes -> std::string
    std::string imgBytes(reinterpret_cast<char*>(data), size);

    // Use DES object (your des.cpp provides DES::CBC_CTS_encrypt)
    DES a; // uses default constructor in your des.cpp
    std::string cipher = a.CBC_CTS_encrypt(imgBytes, keyStr);

    // Make sure ciphertext length equals original size (CBC-CTS preserves length)
    if (cipher.size() != size) {
        std::cerr << "Warning: encrypted data size (" << cipher.size() << ") != original size (" << size << ")\n";
        // Depending on your use case you may want to handle this. For CBC-CTS your implementation SHOULD preserve length.
    }

    // Convert ciphertext string -> vector<unsigned char> for stbi_write_png
    std::vector<unsigned char> encrypted;
    encrypted.assign(reinterpret_cast<const unsigned char*>(cipher.data()),
                     reinterpret_cast<const unsigned char*>(cipher.data() + cipher.size()));

    // free original image data
    stbi_image_free(data);

    const char* outPath = "img_enc.png";
    if (!stbi_write_png(outPath, width, height, channels, encrypted.data(), width * channels)) {
        std::cerr << "Failed to write encrypted PNG: " << outPath << '\n';
        return 1;
    }

    std::cout << "Encrypted PNG written: " << outPath << '\n';
    return 0;
}
