import { readFileSync } from "node:fs";
import { join } from "node:path";
import parse from "html-react-parser";
import BlogFeed from "@/components/BlogFeed";
import ContactDialog from "@/components/ContactDialog";
import PhoneAuth from "@/components/PhoneAuth";
import WorkSlideshow from "@/components/WorkSlideshow";
import logoAsset from "../public/eumlantree-logo-clean.png";

export default function HomePage() {
  const html = readFileSync(join(process.cwd(), "public", "site-content.html"), "utf8").replaceAll("/eumlantree-logo-cutout.png", logoAsset.src);
  return parse(html, {
    replace(node) {
      if (node.type === "tag" && node.name === "div" && node.attribs.id === "blog-feed-mount") return <BlogFeed />;
      if (node.type === "tag" && node.name === "div" && node.attribs.id === "work-slideshow-mount") return <WorkSlideshow />;
      if (node.type === "tag" && node.name === "div" && node.attribs.id === "phone-auth-mount") return <PhoneAuth />;
      if (node.type === "tag" && node.name === "div" && node.attribs.id === "contact-dialog-mount") return <ContactDialog />;
    },
  });
}
