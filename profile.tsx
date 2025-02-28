import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToastContainer, toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera } from "lucide-react";
import api from "@/lib/resourceProvider";
import useGetUser from "@/hooks/useGetUser";
import { useAuth } from "react-oidc-context";
import { Separator } from "@/components/ui/separator";

type ImageType = {
  url: string;
  id?: number;
};

interface ProfileData {
  documentId: string;
  nom: string;
  prenom: string;
  email: string;
  pays: string;
  ville: string;
  titre_emploi: titre_emploi;
  image?: ImageType;
  status: string;
  telephone: string;
}

interface Profile {
  documentId: string;
  nom: string;
  prenom: string;
  email: string;
  pays: string;
  ville: string;
  titre_emploi: string;
  telephone: string;
  image?: {
    id: number;
    url?: string;
  } | null;
}

interface StrapiResponse {
  data: {
    id: number;
    attributes: {
      nom: string;
      prenom: string;
      email: string;
      pays: string;
      ville: string;
      titre_emploi: string;
      telephone: string;
      image: {
        data: {
          id: number;
        } | null;
      } | null;
    };
  };
}

type UploadResponse = {
  id: number;
  url: string;
};

type titre_emploi =
  | "coach"
  | "football_player"
  | "technical_staff"
  | "physical_trainer";

const Profile: React.FC = () => {
  const auth = useAuth();
  const { data } = useGetUser(auth.user?.profile.sub);
  const apiEndpoint = import.meta.env.VITE_BASE_ENDPOINT;

  // États pour gérer l'image et les données du profil
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Nouveaux états pour gérer le statut du bouton de sauvegarde
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [isProfileChanged, setIsProfileChanged] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    documentId: "",
    nom: "",
    prenom: "",
    email: "",
    pays: "",
    ville: "",
    titre_emploi: "coach",
    image: undefined,
    status: "",
    telephone: "",
  });

  // Effet pour charger les données initiales
  useEffect(() => {
    if (data) {
      setProfile({
        documentId: data.documentId || "",
        nom: data.nom || "",
        prenom: data.prenom || "",
        email: data.email || "",
        pays: data.pays || "",
        ville: data.ville || "",
        titre_emploi: (data.titre_emploi as titre_emploi) || "coach",
        image: data.image
          ? {
              url: data.image.url,
              id: data.image.data?.id,
            }
          : undefined,
        status: data.statut || "",
        telephone: data.telephone,
      });
    }
  }, [data]);

  // Gestionnaire pour les changements dans les champs de texte
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
    setIsProfileChanged(true); // Indique que le profil a été modifié
  };

  // Gestionnaire pour le changement de titre d'emploi
  const handleJobTitleChange = (value: titre_emploi) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      titre_emploi: value,
    }));
    setIsProfileChanged(true); // Indique que le profil a été modifié
  };

  // Gestionnaire pour l'upload d'avatar
  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    setIsLoading(true);
    setUploadStatus("uploading"); // Mise à jour du statut d'upload
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await api
        .post("upload", {
          body: formData,
        })
        .json<UploadResponse[]>();

      if (response && response[0]) {
        setProfile((prevProfile) => ({
          ...prevProfile,
          image: {
            url: response[0].url,
            id: response[0].id,
          },
        }));
        setUploadStatus("success");
        setIsProfileChanged(true);
        setUploadError(null);
      }
    } catch (error) {
      setUploadError("Failed to upload image. Please choose a smaller image.");
      console.error(
        "Failed to upload image. Please try again or choose a smaller image:",
        error
      );
      setUploadStatus("error"); // Upload échoué
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire pour la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updateData: Partial<Profile> = {
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        pays: profile.pays,
        ville: profile.ville,
        titre_emploi: profile.titre_emploi,
        telephone: profile.telephone,
        image: profile.image?.id,
      };

      const response = await api
        .put<StrapiResponse>(`utilisateurs/${profile.documentId}`, {
          json: {
            data: updateData,
          },
        })
        .json();

      if (response.data) {
        toast.success("Profile updated successfully", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
        setIsEditing(false);
        setUploadStatus("idle"); // Réinitialiser le statut d'upload
        setIsProfileChanged(false); // Réinitialiser le statut de modification
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire pour l'annulation de l'édition
  const handleCancelEdit = () => {
    setIsEditing(false);
    setUploadStatus("idle");
    setIsProfileChanged(false);
    setUploadError(null);
    // Réinitialiser les données du profil
    if (data) {
      setProfile({
        documentId: data.documentId || "",
        nom: data.nom || "",
        prenom: data.prenom || "",
        email: data.email || "",
        pays: data.pays || "",
        ville: data.ville || "",
        titre_emploi: (data.titre_emploi as titre_emploi) || "coach",
        image: data.image
          ? {
              url: data.image.url,
              id: data.image.data?.id,
            }
          : undefined,
        status: data.statut || "",
        telephone: data.telephone,
      });
    }
    setPreviewImage(null);
  };

  // Fonction pour déterminer si le bouton de sauvegarde doit être désactivé
  const isSaveDisabled = () => {
    if (isLoading) return true;
    if (uploadStatus === "error") return true;
    if (uploadStatus === "uploading") return true;
    if (!isProfileChanged && uploadStatus === "idle") return true;
    return false;
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const inputFields = [
    { label: "First Name", name: "prenom", type: "text" },
    { label: "Last Name", name: "nom", type: "text" },
    { label: "Email", name: "email", type: "email" },
    { label: "Country", name: "pays", type: "text" },
    { label: "City", name: "ville", type: "text" },
    { label: "Phone", name: "telephone", type: "number" },
  ];

  return (
    <div className="flex justify-center items-center">
      <div className="md:m-5 md:px-5 px-2 py-4 w-full max-w-4xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8 md:m-5 md:p-5">
            <div className="h-full rounded-lg bg-white p-5 relative border border-gray-300 shadow-lg">
              <div className="relative mx-auto mb-4 w-24 h-24">
                <ToastContainer />
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={
                      previewImage ||
                      (profile.image?.url
                        ? `${apiEndpoint}${profile.image.url}`
                        : undefined) ||
                      `https://via.placeholder.com/150`
                    }
                    alt={`${profile.prenom} ${profile.nom}`}
                  />
                  <AvatarFallback>
                    {profile.prenom[0]}
                    {profile.nom[0]}
                  </AvatarFallback>
                </Avatar>

                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1"
                    onClick={triggerFileInput}
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div>
                {uploadError && (
                  <p className="text-red-500 text-center text-sm mt-2 mb-2">
                    {uploadError}
                  </p>
                )}
              </div>
              <div className="mb-2 text-center">
                <h2 className="text-xl font-semibold">
                  {profile.prenom} {profile.nom}
                </h2>
                <p className="text-gray-600">{profile.titre_emploi}</p>
                <p className="text-sm text-gray-500">
                  {profile.ville}, {profile.pays}
                </p>
              </div>
            </div>

            <div className="h-full rounded-lg bg-white lg:col-span-2 p-5 border border-gray-300 shadow-lg">
             <div>
              <h1 className="text-md font-semibold">Profile</h1>
             </div>
             <Separator />
              {inputFields.map(({ label, name, type }) => (
                <div key={name} className="flex flex-col  md:flex-row md:items-center  md:space-x-4 mt-4">
                  <label className="w-24 text-sm">{label}</label>
                  <Input
                    type={type}
                    className="w-full focus:border-yellow-500 focus:ring-yellow-500"
                    name={name}
                    value={profile[name as keyof ProfileData] as string}
                    onChange={handleInputChange}
                    disabled={!isEditing || isLoading}
                  />
                </div>
              ))}

              <div className="flex flex-col  md:flex-row md:items-center  md:space-x-4 mt-2">
                <label className="w-24 text-sm">Job Title</label>
                <Select
                  value={profile.titre_emploi}
                  onValueChange={handleJobTitleChange}
                  disabled={!isEditing || isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="football_player">
                      Football Player
                    </SelectItem>
                    <SelectItem value="technical_staff">
                      Technical Staff
                    </SelectItem>
                    <SelectItem value="physical_trainer">
                      Physical Trainer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-6">
                {isEditing ? (
                  <div className="flex space-x-4">
                    <Button
                      type="submit"
                      className="w-full bg-yellow-500 hover:bg-yellow-300 font-bold"
                      variant="default"
                      disabled={isSaveDisabled()}
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-yellow-500 hover:bg-yellow-300 text-white font-bold"
                    variant="secondary"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
