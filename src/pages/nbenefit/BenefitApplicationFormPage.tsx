import { useParams, useNavigate } from "react-router-dom";
import { BenefitApplicationForm } from "@/components/nbenefit/BenefitApplicationForm";

const BenefitApplicationFormPage = () => {
  const { benefitType } = useParams<{ benefitType: string }>();
  const navigate = useNavigate();

  const getBenefitTypeEnum = () => {
    switch (benefitType) {
      case "sickness": return "SICKNESS";
      case "maternity": return "MATERNITY";
      case "employment-injury": return "EMPLOYMENT_INJURY";
      case "funeral-grant": return "FUNERAL_GRANT";
      case "age-benefit": return "AGE_BENEFIT";
      case "invalidity": return "INVALIDITY";
      default: return "SICKNESS";
    }
  };

  return (
    <BenefitApplicationForm
      benefitType={getBenefitTypeEnum() as any}
      onClose={() => navigate(-1)}
    />
  );
};

export default BenefitApplicationFormPage;
