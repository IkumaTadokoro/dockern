import { Checkbox, Command, Confirm } from "./deps.ts";

async function listDockerImages() {
  const process = Deno.run({
    cmd: ["docker", "images", "--format", "{{.Repository}}:{{.Tag}}"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code } = await process.status();
  if (code !== 0) {
    const error = new TextDecoder().decode(await process.stderrOutput());
    console.error(error);
    Deno.exit(code);
  }

  const output = new TextDecoder().decode(await process.output());
  return output.trim().split("\n");
}

async function deleteDockerImages(images: string[]) {
  for (const image of images) {
    const process = Deno.run({
      cmd: ["docker", "rmi", image],
    });

    const { code } = await process.status();
    if (code !== 0) {
      console.error(`Failed to delete image: ${image}`);
    } else {
      console.log(`Deleted image: ${image}`);
    }
  }
}

async function confirmAction(message: string): Promise<boolean> {
  return await Confirm.prompt(message); // Update this line
}

async function listDockerVolumes(): Promise<string[]> {
  const process = Deno.run({
    cmd: ["docker", "volume", "ls", "--format", "{{.Name}}"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code } = await process.status();
  if (code !== 0) {
    const error = new TextDecoder().decode(await process.stderrOutput());
    console.error(error);
    Deno.exit(code);
  }

  const output = new TextDecoder().decode(await process.output());
  return output.trim().split("\n");
}

async function deleteDockerVolumes(volumes: string[]): Promise<void> {
  for (const volume of volumes) {
    const process = Deno.run({
      cmd: ["docker", "volume", "rm", volume],
    });

    const { code } = await process.status();
    if (code !== 0) {
      console.error(`Failed to delete volume: ${volume}`);
    } else {
      console.log(`Deleted volume: ${volume}`);
    }
  }
}

new Command()
  .command("prune-images")
  .description("List and delete selected docker images.")
  .action(async () => {
    const images = await listDockerImages();
    if (images.length === 0) {
      console.log("No images found.");
      return;
    }

    const selectedImages = await Checkbox.prompt<string>({
      message: "Select images to delete",
      options: images.map((image) => ({ name: image, value: image })),
    });

    console.log("Selected images for deletion:", selectedImages.join(", "));

    if (selectedImages.length > 0) {
      await deleteDockerImages(selectedImages);
    } else {
      console.log("No images selected for deletion.");
    }
  })
  .command("prune-volumes")
  .description("List and delete selected docker volumes.")
  .action(async () => {
    const volumes = await listDockerVolumes();
    if (volumes.length === 0) {
      console.log("No volumes found.");
      return;
    }

    const selectedVolumes = await Checkbox.prompt<string>({
      message: "Select volumes to delete",
      options: volumes.map((volume) => ({ name: volume, value: volume })),
    }) as string[];

    if (selectedVolumes.length > 0) {
      await deleteDockerVolumes(selectedVolumes);
    } else {
      console.log("No volumes selected for deletion.");
    }
  })
  .command("dockern")
  .description("Manage docker images and volumes.")
  .action(async () => {
    let selectedImages: string[] = [];
    let selectedVolumes: string[] = [];

    // Confirm and Select Images to delete
    const confirmImageDeletion = await confirmAction(
      "Do you want to delete images?",
    );
    if (confirmImageDeletion) {
      const images = await listDockerImages();
      if (images.length > 0) {
        selectedImages = await Checkbox.prompt<string>({
          message: "Select images to delete",
          options: images.map((image) => ({ name: image, value: image })),
        });
      } else {
        console.log("No images found.");
      }
    }

    // Confirm and Select Volumes to delete
    const confirmVolumeDeletion = await confirmAction(
      "Do you want to delete volumes?",
    );
    if (confirmVolumeDeletion) {
      const volumes = await listDockerVolumes();
      if (volumes.length > 0) {
        selectedVolumes = await Checkbox.prompt<string>({
          message: "Select volumes to delete",
          options: volumes.map((volume) => ({ name: volume, value: volume })),
        }) as string[];
      } else {
        console.log("No volumes found.");
      }
    }

    // If no images or volumes are selected, exit
    if (selectedImages.length === 0 && selectedVolumes.length === 0) {
      console.log("No images or volumes selected for deletion. Exiting.");
      return;
    }

    // Confirm the action
    if (selectedImages.length > 0) {
      console.log("Selected images for deletion:", selectedImages.join(", "));
    }
    if (selectedVolumes.length > 0) {
      console.log("Selected volumes for deletion:", selectedVolumes.join(", "));
    }
    const confirmDeletion = await confirmAction("Confirm deletion?");
    if (confirmDeletion) {
      if (selectedImages.length > 0) await deleteDockerImages(selectedImages); // イメージが選択された場合のみ削除
      if (selectedVolumes.length > 0) {
        await deleteDockerVolumes(selectedVolumes); // ボリュームが選択された場合のみ削除
      }
    } else {
      console.log("Deletion cancelled.");
    }
  })
  .parse(Deno.args);
